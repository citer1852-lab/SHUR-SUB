const fs = require('fs').promises;
const path = require('path');

// ==================== НАСТРОЙКИ ====================
// Приоритет стран (чем раньше в списке, тем выше приоритет)
const COUNTRY_PRIORITY = [
    "россия", "russia", "🇷🇺",
    "германия", "germany", "🇩🇪",
    "нидерланды", "netherlands", "🇳🇱",
    "франция", "france", "🇫🇷",
    "сингапур", "singapore", "🇸🇬",
    "гонконг", "hong kong", "🇭🇰",
    "сша", "usa", "🇺🇸"
];

// Ключевые слова для игровых серверов
const GAMING_KEYWORDS = ["game", "gaming", "игровой"];
// Ключевые слова для обходных серверов (LTE, REALITY, CF, CDN)
const BYPASS_KEYWORDS = ["lte", "reality", "cf", "cdn"];

// Ключевые слова для серверов, которые должны быть в самом конце (без иконки страны, резервные и т.п.)
const LOW_PRIORITY_KEYWORDS = [
    "cf cdn ws", "us reality (backup)", "de reality (best dpi bypass)", "nl grpc", "proxy-backup", "proxy-main", "free server", "stable fallback"
];

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

// ----- Конвертация Shadowsocks в ss:// -----
function convertShadowsocksToURI(out, globalRemarks = '') {
    const servers = out.settings?.servers;
    if (!servers || !servers.length) return null;
    const s = servers[0];
    const address = s.address;
    const port = s.port;
    const method = s.method;
    const password = s.password;
    if (!address || !port || !method || !password) return null;

    const userinfo = `${method}:${password}`;
    const encoded = Buffer.from(userinfo).toString('base64');
    let uri = `ss://${encoded}@${address}:${port}`;

    let tag = out.tag || '';
    if ((!tag || tag === 'proxy') && globalRemarks) tag = globalRemarks;
    if (!tag) tag = `${address}:${port}`;
    uri += `#${encodeURIComponent(tag)}`;
    return uri;
}

// ----- Конвертация VLESS в vless:// -----
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

// ----- Извлечение всех outbound'ов из JSON (рекурсивно) -----
function extractOutbounds(obj, results = []) {
    if (!obj || typeof obj !== 'object') return results;
    if (Array.isArray(obj)) {
        for (const item of obj) extractOutbounds(item, results);
        return results;
    }
    if (obj.protocol && (obj.protocol === 'shadowsocks' || obj.protocol === 'vless')) {
        results.push(obj);
    }
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
            extractOutbounds(obj[key], results);
        }
    }
    return results;
}

// ----- Обработка одного JSON-файла -----
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
            console.log(`   ⚠️ Пропущен outbound: ${out.tag || 'без тега'}`);
        }
    }
    return uris;
}

// ----- Определение приоритета для сортировки -----
function getSortPriority(tag) {
    const lowerTag = tag.toLowerCase();
    
    // 1. Сначала проверяем самые низкоприоритетные (резервные, без страны)
    for (const kw of LOW_PRIORITY_KEYWORDS) {
        if (lowerTag.includes(kw.toLowerCase())) {
            return 1000; // самый низкий приоритет
        }
    }
    
    // 2. Проверяем страны
    for (let i = 0; i < COUNTRY_PRIORITY.length; i++) {
        if (lowerTag.includes(COUNTRY_PRIORITY[i].toLowerCase())) {
            return i; // 0..6
        }
    }
    
    // 3. Проверяем игровые и обходные (LTE, REALITY, CF, CDN) — они идут после стран
    for (const kw of GAMING_KEYWORDS) {
        if (lowerTag.includes(kw)) {
            return 100;
        }
    }
    for (const kw of BYPASS_KEYWORDS) {
        if (lowerTag.includes(kw)) {
            return 100;
        }
    }
    
    // 4. Всё остальное (включая неизвестные) — отправляем в конец, но перед явно низкими (1000)
    return 500;
}

// ----- Сортировка URI по приоритету и алфавиту -----
function sortUris(uris) {
    const withTag = uris.map(uri => {
        let tag = "";
        const hashIndex = uri.lastIndexOf('#');
        if (hashIndex !== -1) {
            tag = decodeURIComponent(uri.substring(hashIndex + 1));
        }
        return { uri, tag };
    });
    withTag.sort((a, b) => {
        const prioA = getSortPriority(a.tag);
        const prioB = getSortPriority(b.tag);
        if (prioA !== prioB) return prioA - prioB;
        // внутри одной группы сортируем по алфавиту
        return a.tag.localeCompare(b.tag);
    });
    return withTag.map(item => item.uri);
}

// ----- Сбор всех URI из внешних источников и локальной папки -----
async function collectAllLines() {
    const allUris = [];

    // Внешние источники
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

    // Локальная папка sources (рекурсивно)
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

    // Удаление дубликатов (полные совпадения строк)
    const unique = new Map();
    for (const uri of allUris) {
        if (!unique.has(uri)) {
            unique.set(uri, uri);
        } else {
            console.log(`   ⚠️ Дубликат пропущен: ${uri.substring(0, 60)}...`);
        }
    }
    const uniqueUris = Array.from(unique.values());
    console.log(`\n📊 Итого уникальных URI: ${uniqueUris.length} (изначально было ${allUris.length})`);

    // Сортировка
    const sortedUris = sortUris(uniqueUris);
    console.log(`📊 Сортировка выполнена: страны → игровые/обходы → остальные (резервные в самом конце)`);
    return sortedUris;
}

function toBase64(text) {
    return Buffer.from(text, 'utf-8').toString('base64');
}

async function main() {
    console.log('🚀 Сборка подписки (Shadowsocks + VLESS) с улучшенной сортировкой\n');
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
        console.log(`📄 ${OUTPUT_TXT} (${base64Data.length} символов)`);
        console.log(`📄 ${OUTPUT_JSON}`);
        console.log(`\n🔗 Ссылка для Happ (импортируйте sub.txt как подписку):`);
        console.log(`   https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
        console.log(`\n💡 Теперь серверы отсортированы: сначала страны, потом игровые/LTE, затем остальные, а резервные (CF CDN WS, US Reality, DE Reality, NL gRPC, proxy-*) — в самом конце.`);
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

main();
