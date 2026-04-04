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
 * Конвертирует outbound Shadowsocks в ss:// URI
 */
function convertShadowsocksToURI(out, globalRemarks = '') {
    const servers = out.settings?.servers;
    if (!servers || !servers.length) return null;
    const s = servers[0];
    const address = s.address;
    const port = s.port;
    const method = s.method;
    const password = s.password;
    if (!address || !port || !method || !password) return null;
    
    // Кодируем метод:пароль в base64
    const userinfo = `${method}:${password}`;
    const encoded = Buffer.from(userinfo).toString('base64');
    let uri = `ss://${encoded}@${address}:${port}`;
    
    // Добавляем тег
    let tag = out.tag || '';
    if ((!tag || tag === 'proxy') && globalRemarks) tag = globalRemarks;
    if (!tag) tag = `${address}:${port}`;
    uri += `#${encodeURIComponent(tag)}`;
    return uri;
}

/**
 * Конвертирует outbound VLESS в vless:// URI
 */
function convertVlessToURI(out, globalRemarks = '') {
    const vnext = out.settings?.vnext?.[0];
    if (!vnext) return null;
    const user = vnext.users?.[0];
    if (!user) return null;
    const address = vnext.address;
    const port = vnext.port;
    const uuid = user.id;
    if (!address || !port || !uuid) return null;
    
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
    
    let tag = out.tag || '';
    if ((!tag || tag === 'proxy') && globalRemarks) tag = globalRemarks;
    if (!tag) tag = `${address}:${port}`;
    uri += `#${encodeURIComponent(tag)}`;
    return uri;
}

/**
 * Извлекает все реальные outbound'ы из JSON-объекта (рекурсивно)
 */
function extractOutbounds(obj, results = []) {
    if (!obj || typeof obj !== 'object') return results;
    
    // Если это массив outbounds
    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractOutbounds(item, results);
        }
        return results;
    }
    
    // Если объект похож на outbound (есть protocol и settings)
    if (obj.protocol && (obj.protocol === 'shadowsocks' || obj.protocol === 'vless')) {
        results.push(obj);
    }
    
    // Рекурсивно обходим все свойства
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
            extractOutbounds(obj[key], results);
        }
    }
    return results;
}

/**
 * Обрабатывает один JSON-файл и возвращает массив URI
 */
async function processJsonFile(filePath, fileName) {
    const content = await fs.readFile(filePath, 'utf-8');
    let json;
    try {
        json = JSON.parse(content);
    } catch (e) {
        console.error(`❌ Ошибка парсинга JSON в ${fileName}: ${e.message}`);
        return [];
    }
    
    const globalRemarks = json.remarks || json.name || path.basename(fileName, '.json');
    const outbounds = extractOutbounds(json);
    const uris = [];
    
    for (const out of outbounds) {
        let uri = null;
        if (out.protocol === 'shadowsocks') {
            uri = convertShadowsocksToURI(out, globalRemarks);
        } else if (out.protocol === 'vless') {
            uri = convertVlessToURI(out, globalRemarks);
        }
        if (uri) {
            uris.push(uri);
        } else {
            console.log(`   ⚠️ Пропущен outbound (неподдерживаемый протокол или ошибка): ${out.tag || 'без тега'}`);
        }
    }
    return uris;
}

/**
 * Рекурсивно обходит папку sources и собирает URI из всех JSON и текстовых файлов
 */
async function collectAllLines() {
    const allUris = [];

    // 1. Внешние источники (URI и URL)
    for (const item of EXTERNAL_SOURCES) {
        if (item.startsWith('vless://') || item.startsWith('ss://') || item.startsWith('vmess://') || item.startsWith('trojan://')) {
            allUris.push(item);
            console.log(`   → добавлен URI: ${item.substring(0, 60)}...`);
        } else {
            try {
                console.log(`📡 Загрузка: ${item}`);
                const content = await fetchUrl(item);
                const lines = content.split('\n').filter(l => l.trim().length > 0);
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('vless://') || trimmed.startsWith('ss://') || trimmed.startsWith('vmess://') || trimmed.startsWith('trojan://')) {
                        allUris.push(trimmed);
                    }
                }
                console.log(`   → добавлено ${lines.length} строк (URI)`);
            } catch (err) {
                console.error(`   → ошибка: ${err.message}`);
            }
        }
    }

    // 2. Локальная папка sources (рекурсивно)
    async function walkDir(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walkDir(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    console.log(`📁 Обработка: ${fullPath}`);
                    if (ext === '.json') {
                        const uris = await processJsonFile(fullPath, entry.name);
                        allUris.push(...uris);
                        console.log(`   → добавлено ${uris.length} URI`);
                    } else {
                        // Текстовый файл: читаем строки, ищем URI
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const lines = content.split('\n');
                        let added = 0;
                        for (let line of lines) {
                            line = line.trim();
                            if (line.startsWith('vless://') || line.startsWith('ss://') || line.startsWith('vmess://') || line.startsWith('trojan://')) {
                                allUris.push(line);
                                added++;
                            }
                        }
                        console.log(`   → добавлено ${added} URI из текстового файла`);
                    }
                }
            }
        } catch (err) {
            console.error(`Ошибка чтения ${dir}: ${err.message}`);
        }
    }
    
    try {
        await walkDir(LOCAL_SOURCES_DIR);
    } catch (err) {
        if (err.code !== 'ENOENT') console.error(err);
        else console.log(`📁 Папка ${LOCAL_SOURCES_DIR} не найдена`);
    }
    
    // Опционально: удаляем дубликаты (но оставляем выбор)
    const unique = new Map();
    for (const uri of allUris) {
        // Простой ключ – весь URI (можно улучшить, но для начала ok)
        if (!unique.has(uri)) {
            unique.set(uri, uri);
        } else {
            console.log(`   ⚠️ Дубликат пропущен: ${uri.substring(0, 60)}...`);
        }
    }
    const finalUris = Array.from(unique.values());
    console.log(`\n📊 Итого уникальных URI: ${finalUris.length} (изначально было ${allUris.length})`);
    return finalUris;
}

function toBase64(text) {
    return Buffer.from(text, 'utf-8').toString('base64');
}

async function main() {
    console.log('🚀 Сборка подписки с поддержкой Shadowsocks и VLESS...\n');
    try {
        const uris = await collectAllLines();
        
        if (uris.length === 0) {
            console.log('⚠️ Не найдено ни одного сервера. Проверьте папку sources/ и внешние источники.');
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
        console.log(`\n🔗 Ссылка для Happ (импортируйте sub.txt как подписку):`);
        console.log(`   https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
        console.log(`\n💡 Теперь в Happ должно отображаться ${uris.length} серверов.`);
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

main();
