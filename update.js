// update.js
const fs = require('fs').promises;
const path = require('path');

// ==================== НАСТРОЙКИ ====================
const EXTERNAL_SOURCES = []; 
const LOCAL_SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_TXT = 'sub.txt';
// ===================================================

async function fetchUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let text = await response.text();
    if (/^[A-Za-z0-9+/=]+$/.test(text.trim())) {
        try {
            text = Buffer.from(text, 'base64').toString('utf-8');
        } catch (e) {}
    }
    return text;
}

/**
 * Нормализует vless:// URI: сортирует параметры запроса, чтобы одинаковые конфиги имели одинаковую строку.
 */
function normalizeVlessUri(uri) {
    try {
        const urlObj = new URL(uri);
        const params = new URLSearchParams(urlObj.search);
        // Сортируем параметры по ключу
        const sorted = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        urlObj.search = new URLSearchParams(sorted).toString();
        return urlObj.toString();
    } catch (e) {
        // Если не удалось распарсить, возвращаем исходную строку
        return uri;
    }
}

/**
 * Преобразует outbound в URI с названием из remarks или tag.
 * Возвращает null, если outbound невалиден (нет address, port или uuid).
 */
function convertOutboundToURI(out, globalRemarks = '') {
    if (out.protocol !== 'vless') return null;
    
    const vnext = out.settings?.vnext?.[0];
    if (!vnext) return null;
    
    const user = vnext.users?.[0];
    if (!user) return null;
    
    const address = vnext.address;
    const port = vnext.port;
    const uuid = user.id;
    if (!address || !port || !uuid) {
        console.log(`   ⚠️ Пропущен outbound: не хватает address/port/uuid`);
        return null;
    }
    
    let uri = `vless://${uuid}@${address}:${port}?encryption=${user.encryption || 'none'}`;
    if (user.flow) uri += `&flow=${user.flow}`;
    
    const stream = out.streamSettings;
    if (stream) {
        if (stream.security === 'reality') {
            const r = stream.realitySettings || {};
            uri += `&security=reality&sni=${encodeURIComponent(r.serverName || '')}&pbk=${r.publicKey || ''}`;
            if (r.shortId) uri += `&sid=${r.shortId}`;
            if (r.fingerprint) uri += `&fp=${r.fingerprint}`;
        } else if (stream.security === 'tls') {
            uri += `&security=tls&sni=${encodeURIComponent(stream.tlsSettings?.serverName || '')}`;
        }
        if (stream.network === 'ws') {
            uri += `&type=ws&path=${encodeURIComponent(stream.wsSettings?.path || '/')}`;
            if (stream.wsSettings?.headers?.Host) uri += `&host=${encodeURIComponent(stream.wsSettings.headers.Host)}`;
        } else if (stream.network === 'grpc') {
            uri += `&type=grpc&serviceName=${encodeURIComponent(stream.grpcSettings?.serviceName || '')}`;
        } else if (stream.network === 'tcp') {
            uri += `&type=tcp`;
        }
    }
    
    let nodeName = out.tag || '';
    if ((!nodeName || nodeName === 'proxy') && globalRemarks) {
        nodeName = globalRemarks;
    }
    if (nodeName && nodeName !== 'proxy') {
        uri += `#${encodeURIComponent(nodeName)}`;
    }
    
    return uri;
}

/**
 * Обрабатывает локальный JSON-файл и извлекает URI с названиями.
 */
async function processLocalFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
        try {
            const json = JSON.parse(content);
            const uris = [];
            const globalRemarks = json.remarks || json.name || '';
            console.log(`   📝 Название конфига: "${globalRemarks}"`);
            
            if (json.outbounds && Array.isArray(json.outbounds)) {
                for (const out of json.outbounds) {
                    const uri = convertOutboundToURI(out, globalRemarks);
                    if (uri) {
                        uris.push(uri);
                    } else {
                        console.log(`   ⚠️ Пропущен невалидный outbound: ${out.tag || 'без тега'}`);
                    }
                }
            }
            return { type: 'uri', lines: uris };
        } catch (e) {
            console.error(`❌ Ошибка парсинга JSON: ${e.message}`);
            return { type: 'uri', lines: [] };
        }
    } else {
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        return { type: 'uri', lines };
    }
}

async function collectAllLines() {
    const allUris = [];

    // 1. Обрабатываем готовые URI из EXTERNAL_SOURCES
    for (const item of EXTERNAL_SOURCES) {
        if (item.startsWith('vless://') || item.startsWith('vmess://') || item.startsWith('trojan://') || item.startsWith('ss://')) {
            allUris.push(item);
            console.log(`   → добавлен URI: ${item.substring(0, 50)}...`);
        } else {
            try {
                console.log(`📡 Загрузка: ${item}`);
                const content = await fetchUrl(item);
                const lines = content.split('\n').filter(l => l.trim().length > 0);
                allUris.push(...lines);
                console.log(`   → добавлено ${lines.length} строк (URI)`);
            } catch (err) {
                console.error(`   → ошибка: ${err.message}`);
            }
        }
    }

    // 2. Обрабатываем локальные файлы из папки sources1
    try {
        const files = await fs.readdir(LOCAL_SOURCES_DIR);
        for (const file of files) {
            if (file === '.gitkeep') continue;
            const filePath = path.join(LOCAL_SOURCES_DIR, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                console.log(`📁 Обработка: ${file}`);
                const result = await processLocalFile(filePath);
                if (result && result.lines.length > 0) {
                    allUris.push(...result.lines);
                    console.log(`   → добавлено ${result.lines.length} URI`);
                }
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Ошибка: ${err.message}`);
        } else {
            console.log(`📁 Папка ${LOCAL_SOURCES_DIR} не найдена`);
        }
    }
    
    // 3. Нормализуем все URI (сортируем параметры) и удаляем дубликаты
    const normalizedMap = new Map();
    for (const uri of allUris) {
        const normalized = normalizeVlessUri(uri);
        // Сохраняем только первое вхождение (можно также проверять по чему-то ещё, но достаточно)
        if (!normalizedMap.has(normalized)) {
            normalizedMap.set(normalized, uri);
        } else {
            console.log(`   ⚠️ Дубликат удалён: ${normalized.substring(0, 80)}...`);
        }
    }
    const uniqueUris = Array.from(normalizedMap.values());
    console.log(`\n📊 Итого уникальных URI после нормализации: ${uniqueUris.length}`);
    return uniqueUris;
}

function toBase64(text) {
    return Buffer.from(text, 'utf-8').toString('base64');
}

async function main() {
    console.log('🚀 Начинаем сборку подписки...\n');
    try {
        const uris = await collectAllLines();
        
        if (uris.length === 0) {
            console.log('⚠️ Внимание: не найдено ни одного конфига!');
            console.log('   Добавьте файлы в папку sources/ и запустите снова.');
            return;
        }
        
        const plainText = uris.join('\n');
        const base64Data = toBase64(plainText);
        
        await fs.writeFile(OUTPUT_TXT, base64Data);
        
        const outputJson = {
            lastUpdated: new Date().toISOString(),
            totalUris: uris.length,
            configsBase64: base64Data,
            configsPlain: plainText
        };
        await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputJson, null, 2));
        
        console.log(`\n✅ Подписка создана!`);
        console.log(`📄 sub.txt (${base64Data.length} символов)`);
        console.log(`\n🔗 Ссылка для HApp:`);
        console.log(`   https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

main();
