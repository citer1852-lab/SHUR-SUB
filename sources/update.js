// update.js
const fs = require('fs').promises;
const path = require('path');

// ==================== НАСТРОЙКИ ====================
// Внешние подписки (можно менять, добавлять, удалять)
const EXTERNAL_SOURCES = [
    "https://raw.githubusercontent.com/whoahaow/rjsxrd/main/default/6.txt",
    "https://raw.githubusercontent.com/whoahaow/rjsxrd/main/default/all-secure.txt",
    "https://raw.githubusercontent.com/whoahaow/rjsxrd/main/bypass/bypass-all.txt",
    "https://github.com/nikita29a/FreeProxyList/raw/refs/heads/main/mirror/1.txt",
    // Добавляйте сюда любые другие URL
];

// Папка с вашими локальными файлами
const LOCAL_SOURCES_DIR = './sources';

// Выходные файлы
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

function convertOutboundToURI(out) {
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
        uri += `#${encodeURIComponent(out.tag || 'node')}`;
        return uri;
    }
    return null;
}

async function processLocalFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
        try {
            const json = JSON.parse(content);
            return { type: 'json', content: json };
        } catch (e) {
            console.error(`❌ Ошибка парсинга JSON в файле ${filePath}: ${e.message}`);
            return null;
        }
    } else {
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        return { type: 'uri', lines };
    }
}

async function collectAllLines() {
    const allUris = [];
    const allJsonConfigs = [];

    for (const url of EXTERNAL_SOURCES) {
        try {
            console.log(`📡 Загрузка: ${url}`);
            const content = await fetchUrl(url);
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            allUris.push(...lines);
            console.log(`   → добавлено ${lines.length} строк (URI)`);
        } catch (err) {
            console.error(`   → ошибка: ${err.message}`);
        }
    }

    try {
        const files = await fs.readdir(LOCAL_SOURCES_DIR);
        for (const file of files) {
            const filePath = path.join(LOCAL_SOURCES_DIR, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile() && file !== '.gitkeep') {
                console.log(`📁 Обработка локального файла: ${file}`);
                const result = await processLocalFile(filePath);
                if (result) {
                    if (result.type === 'uri') {
                        allUris.push(...result.lines);
                        console.log(`   → добавлено ${result.lines.length} строк (URI)`);
                    } else if (result.type === 'json') {
                        allJsonConfigs.push(result.content);
                        console.log(`   → добавлен 1 JSON-конфиг`);
                    }
                }
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error(`Ошибка при чтении локальной папки: ${err.message}`);
        }
    }
    
    const uniqueUris = [...new Map(allUris.map(line => [line, line])).values()];
    console.log(`\n📊 Итого уникальных URI: ${uniqueUris.length}`);
    console.log(`📊 Итого JSON-конфигов: ${allJsonConfigs.length}`);
    
    return { uris: uniqueUris, jsonConfigs: allJsonConfigs };
}

function toBase64(text) {
    return Buffer.from(text, 'utf-8').toString('base64');
}

async function main() {
    console.log('🚀 Начинаем сборку подписки...\n');
    try {
        const { uris, jsonConfigs } = await collectAllLines();
        
        const outputJson = {
            lastUpdated: new Date().toISOString(),
            totalUris: uris.length,
            totalJsonConfigs: jsonConfigs.length,
            sources: {
                external: EXTERNAL_SOURCES,
                local: `files in ${LOCAL_SOURCES_DIR}`
            },
            configs: uris.join('\n'),
            jsonConfigs: jsonConfigs,
            configsBase64: toBase64(uris.join('\n'))
        };
        
        await fs.writeFile(OUTPUT_JSON, JSON.stringify(outputJson, null, 2));
        
        const base64ForHapp = toBase64(uris.join('\n'));
        await fs.writeFile(OUTPUT_TXT, base64ForHapp);
        
        console.log(`\n✅ Подписка сохранена:`);
        console.log(`   - ${OUTPUT_JSON}`);
        console.log(`   - ${OUTPUT_TXT}`);
    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    }
}

main();
