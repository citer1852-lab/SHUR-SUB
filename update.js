const fs = require('fs');
const path = require('path');

// ====== НАСТРОЙКИ ======
const SOURCE_DIR = './sources'; // сюда распаковываешь ZIP
const OUTPUT = './sub.txt';
// =======================

// ====== COUNTRY DETECT ======
function detectGroup(text) {
    const t = text.toUpperCase();

    if (t.includes('RU') || t.includes('RUSSIA') || t.includes('MOSCOW')) {
        return 1;
    }

    if (t.includes('REALITY') || t.includes('CF') || t.includes('CDN')) {
        return 3; // обход
    }

    if (t.includes('GAME') || t.includes('GAMING')) {
        return 4; // игровые
    }

    return 2; // остальные страны
}

// ====== EXTRACT ======
function extractOutbounds(obj, results = []) {
    if (!obj || typeof obj !== 'object') return results;

    if (Array.isArray(obj)) {
        obj.forEach(i => extractOutbounds(i, results));
        return results;
    }

    if (obj.protocol && obj.settings) {
        results.push(obj);
    }

    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            extractOutbounds(obj[key], results);
        }
    }

    return results;
}

// ====== TAG ======
function buildTag(out, fileName) {
    const base = out.tag || fileName || 'node';

    return base;
}

// ====== VLESS ======
function convertVless(out, fileName) {
    const v = out.settings?.vnext?.[0];
    const u = v?.users?.[0];
    if (!v || !u) return null;

    let uri = `vless://${u.id}@${v.address}:${v.port}?encryption=none`;

    const tag = buildTag(out, fileName);

    return uri + '#' + encodeURIComponent(tag);
}

// ====== MAIN ======
function walk(dir, files = []) {
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
            walk(full, files);
        } else {
            files.push(full);
        }
    });

    return files;
}

function main() {
    const files = walk(SOURCE_DIR);

    let uris = [];

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const content = fs.readFileSync(file, 'utf-8');

        let json;
        try {
            json = JSON.parse(content);
        } catch {
            continue;
        }

        const outs = extractOutbounds(json);

        for (const o of outs) {
            let uri = null;

            if (o.protocol === 'vless') {
                uri = convertVless(o, path.basename(file));
            }

            if (uri) uris.push(uri);
        }
    }

    // ====== СОРТИРОВКА ======
    uris.sort((a, b) => {
        const ta = decodeURIComponent(a.split('#')[1] || '');
        const tb = decodeURIComponent(b.split('#')[1] || '');

        return detectGroup(ta) - detectGroup(tb);
    });

    const plain = uris.join('\n');
    const base64 = Buffer.from(plain).toString('base64');

    fs.writeFileSync(OUTPUT, base64);

    console.log('✅ Готово');
}

main();
