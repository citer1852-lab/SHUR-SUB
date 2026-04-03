// update.js (устойчивая версия)
const fs = require('fs').promises;
const path = require('path');

const LOCAL_SOURCES_DIR = './sources';
const OUTPUT_TXT = 'sub.txt';
const OUTPUT_JSON = 'subscription.json';

async function processLocalFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
        try {
            const json = JSON.parse(content);
            // Проверяем, что это Xray-конфиг (есть outbounds)
            if (json.outbounds && Array.isArray(json.outbounds)) {
                const uris = [];
                for (const out of json.outbounds) {
                    if (out.protocol === 'vless') {
                        const vnext = out.settings?.vnext?.[0];
                        if (vnext && vnext.users?.[0]) {
                            const user = vnext.users[0];
                            let uri = `vless://${user.id}@${vnext.address}:${vnext.port}?encryption=${user.encryption || 'none'}`;
                            if (user.flow) uri += `&flow=${user.flow}`;
                            const stream = out.streamSettings;
                            if (stream?.security === 'reality') {
                                const r = stream.realitySettings || {};
                                uri += `&security=reality&sni=${encodeURIComponent(r.serverName || '')}&pbk=${r.publicKey || ''}`;
                                if (r.shortId) uri += `&sid=${r.shortId}`;
                            }
                            uri += `#${encodeURIComponent(out.tag || 'node')}`;
                            uris.push(uri);
                        }
                    }
                }
                return { type: 'uri', lines: uris };
            } else {
                console.warn(`⚠️ Файл ${filePath} не является Xray-конфигом, пропускаем`);
                return { type: 'uri', lines: [] };
            }
        } catch (e) {
            console.error(`❌ Ошибка парсинга JSON в файле ${filePath}: ${e.message}`);
            return { type: 'uri', lines: [] };
        }
    } else {
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        return { type: 'uri', lines };
    }
}

async function collectAllLines() {
    const allUris = [];
    
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
        }
    }
    
    const uniqueUris = [...new Map(allUris.map(uri => [uri, uri])).values()];
    console.log(`\n📊 Итого URI: ${uniqueUris.length}`);
    return uniqueUris;
}

async function main() {
    console.log('🚀 Начинаем сборку...\n');
    try {
        const uris = await collectAllLines();
        const plainText = uris.join('\n');
        const base64Data = Buffer.from(plainText, 'utf-8').toString('base64');
        
        await fs.writeFile(OUTPUT_TXT, base64Data);
        
        const outputJson = {
            lastUpdated: new Date().toISOString(),
            totalUris: uris.length,
            configsBase64: base64Data
        };
        await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputJson, null, 2));
        
        console.log(`\n✅ Подписка создана!`);
        console.log(`📄 sub.txt (${base64Data.length} символов)`);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

main();
