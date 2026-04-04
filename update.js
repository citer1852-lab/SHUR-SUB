const fs = require('fs').promises;
const path = require('path');
const net = require('net');

// ==================== НАСТРОЙКИ ====================
const EXTERNAL_SOURCES = [];
const LOCAL_SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_TXT = 'sub.txt';

const TIMEOUT = 4000; // ms
const MAX_CONCURRENT = 50; // параллельные проверки
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

// ==================== PARSING ====================

function parseAddressPort(uri) {
    try {
        const url = new URL(uri);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 443
        };
    } catch {
        return null;
    }
}

// ==================== ПРОВЕРКА РАБОТОСПОСОБНОСТИ ====================

function checkTcp(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        let done = false;

        socket.setTimeout(TIMEOUT);

        socket.connect(port, host, () => {
            done = true;
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            if (!done) resolve(false);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}

async function filterWorking(uris) {
    console.log(`\n🔍 Проверка ${uris.length} нод...\n`);

    const results = [];
    let active = 0;
    let index = 0;

    return new Promise((resolve) => {
        function next() {
            if (index >= uris.length && active === 0) {
                return resolve(results);
            }

            while (active < MAX_CONCURRENT && index < uris.length) {
                const uri = uris[index++];
                active++;

                (async () => {
                    const parsed = parseAddressPort(uri);
                    if (!parsed) {
                        active--;
                        next();
                        return;
                    }

                    const ok = await checkTcp(parsed.host, parsed.port);

                    if (ok) {
                        console.log(`✅ ${parsed.host}:${parsed.port}`);
                        results.push(uri);
                    } else {
                        console.log(`❌ ${parsed.host}:${parsed.port}`);
                    }

                    active--;
                    next();
                })();
            }
        }

        next();
    });
}

// ==================== СОРТИРОВКА ====================

function detectCountryPriority(uri) {
    const decoded = decodeURIComponent(uri).toUpperCase();

    const map = [
        'RU','UA','KZ','BY',
        'DE','NL','FR','PL',
        'GB','US','CA','JP','SG'
    ];

    for (let i = 0; i < map.length; i++) {
        if (decoded.includes(map[i])) return i;
    }

    return 999;
}

// ==================== СБОР ====================

async function collectAllLines() {
    const allUris = [];

    for (const item of EXTERNAL_SOURCES) {
        try {
            const content = await fetchUrl(item);
            const lines = content.split('\n');

            for (const line of lines) {
                const t = line.trim();
                if (t.startsWith('vless://') || t.startsWith('ss://') || t.startsWith('vmess://') || t.startsWith('trojan://')) {
                    allUris.push(t);
                }
            }
        } catch (e) {}
    }

    async function walk(dir) {
        try {
            const files = await fs.readdir(dir, { withFileTypes: true });

            for (const f of files) {
                const full = path.join(dir, f.name);

                if (f.isDirectory()) {
                    await walk(full);
                } else {
                    const content = await fs.readFile(full, 'utf-8');
                    const lines = content.split('\n');

                    for (const line of lines) {
                        const t = line.trim();
                        if (t.startsWith('vless://') || t.startsWith('ss://') || t.startsWith('vmess://') || t.startsWith('trojan://')) {
                            allUris.push(t);
                        }
                    }
                }
            }
        } catch {}
    }

    await walk(LOCAL_SOURCES_DIR);

    const unique = [...new Set(allUris)];
    console.log(`📊 Найдено: ${unique.length} уникальных URI`);

    return unique;
}

// ==================== MAIN ====================

function toBase64(text) {
    return Buffer.from(text).toString('base64');
}

async function main() {
    console.log('🚀 Ultimate Subscription Builder\n');

    const all = await collectAllLines();

    if (!all.length) {
        console.log('❌ Нет нод');
        return;
    }

    const working = await filterWorking(all);

    console.log(`\n⚡ Рабочих: ${working.length}\n`);

    // сортировка
    working.sort((a, b) => {
        const pa = detectCountryPriority(a);
        const pb = detectCountryPriority(b);
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b);
    });

    const plain = working.join('\n');
    const base64 = toBase64(plain);

    await fs.writeFile(OUTPUT_TXT, base64);
    await fs.writeFile(OUTPUT_JSON, JSON.stringify({
        total: working.length,
        updated: new Date().toISOString(),
        data: base64
    }, null, 2));

    console.log(`✅ Готово: ${working.length} рабочих серверов`);
}

main();
