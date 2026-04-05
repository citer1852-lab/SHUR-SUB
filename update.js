const fs = require('fs').promises;
const path = require('path');
const net = require('net');

// ==================== НАСТРОЙКИ ====================
const EXTERNAL_SOURCES = [];
const LOCAL_SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_TXT = 'sub.txt';

const TIMEOUT = 4000;
const MAX_CONCURRENT = 50;
// ===================================================

// ==================== FETCH ====================
async function fetchUrl(url) {
    const res = await fetch(url);
    let text = await res.text();

    if (/^[A-Za-z0-9+/=]+$/.test(text.trim())) {
        try {
            text = Buffer.from(text, 'base64').toString('utf-8');
        } catch {}
    }
    return text;
}

// ==================== UNIVERSAL JSON PARSER ====================
function extractOutboundsDeep(obj, results = []) {
    if (!obj || typeof obj !== 'object') return results;

    if (Array.isArray(obj)) {
        obj.forEach(i => extractOutboundsDeep(i, results));
        return results;
    }

    if (obj.protocol && obj.settings) {
        results.push(obj);
    }

    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            extractOutboundsDeep(obj[key], results);
        }
    }

    return results;
}

// ==================== COUNTRY DETECTION ====================
function detectCountry(text) {
    const t = text.toUpperCase();

    const map = [
        { keys: ['RUSSIA','MOSCOW','RU','.RU'], flag: '🇷🇺', code: 'RU', p: 1 },
        { keys: ['UKRAINE','UA'], flag: '🇺🇦', code: 'UA', p: 2 },
        { keys: ['KAZAKH','KZ'], flag: '🇰🇿', code: 'KZ', p: 3 },

        { keys: ['GERMANY','DE'], flag: '🇩🇪', code: 'DE', p: 4 },
        { keys: ['NETHERLAND','NL'], flag: '🇳🇱', code: 'NL', p: 5 },
        { keys: ['FRANCE','FR'], flag: '🇫🇷', code: 'FR', p: 6 },

        { keys: ['USA','US'], flag: '🇺🇸', code: 'US', p: 7 },
        { keys: ['CANADA','CA'], flag: '🇨🇦', code: 'CA', p: 8 },
        { keys: ['JAPAN','JP'], flag: '🇯🇵', code: 'JP', p: 9 }
    ];

    for (const c of map) {
        if (c.keys.some(k => t.includes(k))) return c;
    }

    return { flag: '🌍', code: 'OTHER', p: 999 };
}

// ==================== TAG BUILDER ====================
function buildTag(out, fileName) {
    const base =
        out.tag ||
        out.remarks ||
        fileName ||
        'node';

    const country = detectCountry(base + JSON.stringify(out));

    const clean = base.replace(/[^\w\s\-]/g, '').trim();

    return `${country.flag} ${country.code} ${clean}`;
}

// ==================== CONVERTERS ====================
function convertVless(out, fileName) {
    const v = out.settings?.vnext?.[0];
    const u = v?.users?.[0];
    if (!v || !u) return null;

    let uri = `vless://${u.id}@${v.address}:${v.port}?encryption=${u.encryption || 'none'}`;

    if (u.flow) uri += `&flow=${u.flow}`;

    const s = out.streamSettings || {};

    if (s.security === 'reality') {
        const r = s.realitySettings || {};
        uri += `&security=reality&sni=${r.serverName}&pbk=${r.publicKey}`;
        if (r.shortId) uri += `&sid=${r.shortId}`;
    }

    if (s.security === 'tls') {
        uri += `&security=tls`;
    }

    if (s.network === 'ws') {
        uri += `&type=ws&path=${encodeURIComponent(s.wsSettings?.path || '/')}`;
    }

    if (s.network === 'grpc') {
        uri += `&type=grpc`;
    }

    const tag = buildTag(out, fileName);
    uri += `#${encodeURIComponent(tag)}`;

    return uri;
}

function convertSS(out, fileName) {
    const s = out.settings?.servers?.[0];
    if (!s) return null;

    const base = Buffer.from(`${s.method}:${s.password}`).toString('base64');
    let uri = `ss://${base}@${s.address}:${s.port}`;

    const tag = buildTag(out, fileName);
    uri += `#${encodeURIComponent(tag)}`;

    return uri;
}

// ==================== TCP CHECK ====================
function checkTcp(host, port) {
    return new Promise(resolve => {
        const sock = new net.Socket();

        sock.setTimeout(TIMEOUT);

        sock.connect(port, host, () => {
            sock.destroy();
            resolve(true);
        });

        sock.on('error', () => resolve(false));
        sock.on('timeout', () => {
            sock.destroy();
            resolve(false);
        });
    });
}

// ==================== FILTER WORKING ====================
async function filterWorking(uris) {
    const results = [];
    let i = 0;
    let active = 0;

    return new Promise(resolve => {
        function next() {
            if (i >= uris.length && active === 0) return resolve(results);

            while (active < MAX_CONCURRENT && i < uris.length) {
                const uri = uris[i++];
                active++;

                (async () => {
                    try {
                        const url = new URL(uri);
                        const ok = await checkTcp(url.hostname, url.port || 443);

                        if (ok) {
                            console.log(`✅ ${url.hostname}`);
                            results.push(uri);
                        } else {
                            console.log(`❌ ${url.hostname}`);
                        }
                    } catch {}

                    active--;
                    next();
                })();
            }
        }
        next();
    });
}

// ==================== COLLECT ====================
async function collect() {
    const list = [];

    async function walk(dir) {
        try {
            const files = await fs.readdir(dir, { withFileTypes: true });

            for (const f of files) {
                const full = path.join(dir, f.name);

                if (f.isDirectory()) {
                    await walk(full);
                } else {
                    const content = await fs.readFile(full, 'utf-8');

                    if (f.name.endsWith('.json')) {
                        const json = JSON.parse(content);
                        const outs = extractOutboundsDeep(json);

                        for (const o of outs) {
                            let uri = null;

                            if (o.protocol === 'vless') uri = convertVless(o, f.name);
                            if (o.protocol === 'shadowsocks') uri = convertSS(o, f.name);

                            if (uri) list.push(uri);
                        }
                    } else {
                        content.split('\n').forEach(l => {
                            if (l.startsWith('vless://') || l.startsWith('ss://')) {
                                list.push(l.trim());
                            }
                        });
                    }
                }
            }
        } catch {}
    }

    await walk(LOCAL_SOURCES_DIR);

    return [...new Set(list)];
}

// ==================== MAIN ====================
(async () => {
    console.log('🚀 BUILDING SUBSCRIPTION\n');

    const raw = await collect();

    console.log(`📊 найдено: ${raw.length}`);

    const working = await filterWorking(raw);

    console.log(`⚡ рабочих: ${working.length}`);

    working.sort((a, b) => {
        const ta = decodeURIComponent(a.split('#')[1] || '');
        const tb = decodeURIComponent(b.split('#')[1] || '');

        const ca = detectCountry(ta);
        const cb = detectCountry(tb);

        if (ca.p !== cb.p) return ca.p - cb.p;

        return ta.localeCompare(tb);
    });

    const plain = working.join('\n');
    const base64 = Buffer.from(plain).toString('base64');

    await fs.writeFile(OUTPUT_TXT, base64);
    await fs.writeFile(OUTPUT_JSON, JSON.stringify({
        total: working.length,
        updated: new Date().toISOString()
    }, null, 2));

    console.log('\n✅ ГОТОВО');
})();
