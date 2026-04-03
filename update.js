// update.js
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
]; // пока пусто
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
 * Преобразует outbound в URI с названием из remarks или tag
 */
function convertOutboundToURI(out, globalRemarks = '') {
    if (out.protocol === 'vless') {
        const vnext = out.settings?.vnext?.[0];
        if (!vnext) return null;
        const user = vnext.users?.[0];
        if (!user) return null;
        
        let uri = `vless://${user.id}@${vnext.address}:${vnext.port}?encryption=${user.encryption || 'none'}`;
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
        
        // ✅ Добавляем название: приоритет у out.tag, затем у globalRemarks
        let nodeName = out.tag || '';
        if ((!nodeName || nodeName === 'proxy') && globalRemarks) {
            nodeName = globalRemarks;
        }
        if (nodeName && nodeName !== 'proxy') {
            uri += `#${encodeURIComponent(nodeName)}`;
        }
        
        return uri;
    }
    return null;
}

/**
 * Обрабатывает локальный JSON-файл и извлекает URI с названиями
 */
async function processLocalFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
        try {
            const json = JSON.parse(content);
            const uris = [];
            
            // ✅ Берём глобальное название из поля "remarks"
            const globalRemarks = json.remarks || json.name || '';
            console.log(`   📝 Название конфига: "${globalRemarks}"`);
            
            if (json.outbounds && Array.isArray(json.outbounds)) {
                for (const out of json.outbounds) {
                    const uri = convertOutboundToURI(out, globalRemarks);
                    if (uri) uris.push(uri);
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

    for (const item of EXTERNAL_SOURCES) {
        if (item.startsWith('vless://') || item.startsWith('vmess://') || item.startsWith('trojan://') || item.startsWith('ss://')) {
            // Это уже готовый URI, добавляем как есть
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
    
    const uniqueUris = [...new Map(allUris.map(uri => [uri, uri])).values()];
    console.log(`\n📊 Итого URI: ${uniqueUris.length}`);
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
