const fs = require('fs').promises;
const path = require('path');

// ==================== НАСТРОЙКИ ====================
const EXTERNAL_SOURCES = [
    "vless://cad6daf7-6cf8-4e1b-b0d5-aa0bea400d2a@de.monkeyisland.xyz:443?type=tcp&security=reality&flow=xtls-rprx-vision&fp=chrome&pbk=2AKBmK0PMf2zUMhRo1Ad-WNf_XoRk3AN-SGo6ZdhxA4&sid=a0321aad8db9924f&sni=de.monkeyisland.xyz#🇩🇪_DE_REALITY",
    "vless://a7b1b295-89c0-4794-bc3b-13af6cf63312@185.162.11.223:443?security=reality&encryption=none&pbk=htJuCzotUMp7MYP7ZEWKWT1iEuAbr5cDKoX32Ego6WE&headerType=none&fp=chrome&type=tcp&flow=xtls-rprx-vision&sni=sun6-21.userapi.com&sid=edbc04c389#🇳🇱_NL_REALITY",
    "vless://a91b9d7f-eca5-43a5-9524-2201817225d6@103.35.188.157:443?type=tcp&security=reality&flow=xtls-rprx-vision&fp=chrome&pbk=fy2Jdffg5wE6eUhSJP2Tv3xn06bX6ou_kNRyZ9zl314&sid=514be820&sni=google.com#🇺🇸_US_REALITY",
    "vless://4c3a2f39-dc52-4322-ac66-83010d12bfc0@85.239.33.76:4354?security=reality&encryption=none&pbk=SbVKOEMjK0sIlbwg4akyBg5mL5KZwwB-ed4eEE7YnRc&headerType=none&fp=chrome&type=tcp&flow=xtls-rprx-vision&sni=apple.com#🇫🇷_FR_REALITY",
    "vless://6d0e9ded-d23d-4ffb-b165-7bc757be84d3@89.124.79.248:443?security=reality&flow=xtls-rprx-vision&sni=www.google.com&type=tcp&fp=chrome&pbk=VFzQg-tlMPhO7wBJNQJD8M82zPxnCTy_Y2oHWgsFbzQ&sid=10402c47a7e61563#🇳🇱_NL_REALITY_2",
    "vless://0ca855d9-7c03-40eb-929b-919f934abdc3@104.16.30.239:80?encryption=none&security=none&type=ws&host=amirvpn.amirhm00100.workers.dev&path=%2F%3Fed%3D2048#🇨🇦_CA_WORKERS"
];
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
    // Если имя пустое, генерируем по адресу:порту
    if (!nodeName || nodeName === 'proxy') {
        nodeName = `${address}:${port}`;
    }
    uri += `#${encodeURIComponent(nodeName)}`;
    
    return uri;
}

/**
 * Рекурсивно обходит папку и обрабатывает все файлы.
 */
async function processDirectory(dir, allUris, processedFiles = new Set()) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await processDirectory(fullPath, allUris, processedFiles);
            } else if (entry.isFile()) {
                if (processedFiles.has(fullPath)) continue;
                processedFiles.add(fullPath);
                
                const ext = path.extname(entry.name).toLowerCase();
                console.log(`📁 Обработка: ${fullPath}`);
                
                if (ext === '.json') {
                    try {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const json = JSON.parse(content);
                        const globalRemarks = json.remarks || json.name || path.basename(entry.name, '.json');
                        let outboundCount = 0;
                        
                        if (json.outbounds && Array.isArray(json.outbounds)) {
                            for (const out of json.outbounds) {
                                const uri = convertOutboundToURI(out, globalRemarks);
                                if (uri) {
                                    allUris.push(uri);
                                    outboundCount++;
                                } else {
                                    console.log(`   ⚠️ Пропущен outbound: ${out.tag || 'без тега'}`);
                                }
                            }
                        }
                        console.log(`   → добавлено ${outboundCount} URI из JSON`);
                    } catch (e) {
                        console.error(`   ❌ Ошибка парсинга JSON: ${e.message}`);
                    }
                } else {
                    // Текстовый файл: читаем строки, ищем vless://
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');
                    let added = 0;
                    for (let line of lines) {
                        line = line.trim();
                        if (line.startsWith('vless://')) {
                            allUris.push(line);
                            added++;
                        }
                    }
                    console.log(`   → добавлено ${added} URI из текстового файла`);
                }
            }
        }
    } catch (err) {
        console.error(`Ошибка чтения папки ${dir}: ${err.message}`);
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
                for (const line of lines) {
                    if (line.trim().startsWith('vless://')) {
                        allUris.push(line.trim());
                    }
                }
                console.log(`   → добавлено ${lines.length} строк (URI)`);
            } catch (err) {
                console.error(`   → ошибка: ${err.message}`);
            }
        }
    }

    // 2. Рекурсивно обрабатываем локальную папку sources
    try {
        await processDirectory(LOCAL_SOURCES_DIR, allUris);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Ошибка: ${err.message}`);
        } else {
            console.log(`📁 Папка ${LOCAL_SOURCES_DIR} не найдена`);
        }
    }
    
    // Убираем дубликаты? – Оставляем как есть, если нужно, раскомментировать.
    // Но чтобы не терять конфиги, лучше не удалять.
    // Можно просто вывести предупреждение о дубликатах.
    const unique = new Set();
    const duplicates = [];
    for (const uri of allUris) {
        if (unique.has(uri)) {
            duplicates.push(uri);
        } else {
            unique.add(uri);
        }
    }
    if (duplicates.length > 0) {
        console.log(`\n⚠️ Найдено ${duplicates.length} дублирующихся URI. Они будут сохранены, но Happ может их объединить.`);
        // Если хотите удалить дубликаты – замените allUris на Array.from(unique)
    }
    
    console.log(`\n📊 Итого собрано URI: ${allUris.length}`);
    return allUris;
}

function toBase64(text) {
    return Buffer.from(text, 'utf-8').toString('base64');
}

async function main() {
    console.log('🚀 Начинаем сборку подписки (сохраняем ВСЕ конфиги)...\n');
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
        console.log(`📄 subscription.json`);
        console.log(`\n🔗 Ссылка для Happ:`);
        console.log(`   https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
        console.log(`\n💡 Если Happ показывает не все серверы, проверьте:`);
        console.log(`   1. Что каждый JSON-файл содержит массив outbounds.`);
        console.log(`   2. Что нет дублирующихся тегов (tag) внутри одного файла.`);
        console.log(`   3. Что все серверы имеют address, port и uuid.`);
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

main();
