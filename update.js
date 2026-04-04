const fs = require('fs').promises;
const path = require('path');

const EXTERNAL_SOURCES = [
    "vless://cad6daf7-6cf8-4e1b-b0d5-aa0bea400d2a@de.monkeyisland.xyz:443?type=tcp&security=reality&flow=xtls-rprx-vision&fp=chrome&pbk=2AKBmK0PMf2zUMhRo1Ad-WNf_XoRk3AN-SGo6ZdhxA4&sid=a0321aad8db9924f&sni=de.monkeyisland.xyz#🇩🇪_DE_REALITY",
    "vless://a7b1b295-89c0-4794-bc3b-13af6cf63312@185.162.11.223:443?security=reality&encryption=none&pbk=htJuCzotUMp7MYP7ZEWKWT1iEuAbr5cDKoX32Ego6WE&headerType=none&fp=chrome&type=tcp&flow=xtls-rprx-vision&sni=sun6-21.userapi.com&sid=edbc04c389#🇳🇱_NL_REALITY",
    "vless://a91b9d7f-eca5-43a5-9524-2201817225d6@103.35.188.157:443?type=tcp&security=reality&flow=xtls-rprx-vision&fp=chrome&pbk=fy2Jdffg5wE6eUhSJP2Tv3xn06bX6ou_kNRyZ9zl314&sid=514be820&sni=google.com#🇺🇸_US_REALITY",
    "vless://4c3a2f39-dc52-4322-ac66-83010d12bfc0@85.239.33.76:4354?security=reality&encryption=none&pbk=SbVKOEMjK0sIlbwg4akyBg5mL5KZwwB-ed4eEE7YnRc&headerType=none&fp=chrome&type=tcp&flow=xtls-rprx-vision&sni=apple.com#🇫🇷_FR_REALITY",
    "vless://6d0e9ded-d23d-4ffb-b165-7bc757be84d3@89.124.79.248:443?security=reality&flow=xtls-rprx-vision&sni=www.google.com&type=tcp&fp=chrome&pbk=VFzQg-tlMPhO7wBJNQJD8M82zPxnCTy_Y2oHWgsFbzQ&sid=10402c47a7e61563#🇳🇱_NL_REALITY_2",
    "vless://0ca855d9-7c03-40eb-929b-919f934abdc3@104.16.30.239:80?encryption=none&security=none&type=ws&host=amirvpn.amirhm00100.workers.dev&path=%2F%3Fed%3D2048#🇨🇦_CA_WORKERS"
];
const LOCAL_SOURCES_DIR = './sources';
const OUTPUT_DIR = './output';   // сюда сложим готовые JSON-профили

// --- Вспомогательные функции ---
async function ensureDir(dir) {
    try { await fs.mkdir(dir, { recursive: true }); } catch(e) {}
}

function parseVlessUri(uri, defaultName) {
    try {
        const url = new URL(uri);
        const uuid = url.username;
        const address = url.hostname;
        const port = parseInt(url.port) || 443;
        const params = new URLSearchParams(url.search);
        const out = {
            tag: decodeURIComponent(url.hash.substring(1)) || defaultName,
            protocol: "vless",
            settings: { vnext: [{ address, port, users: [{ id: uuid, encryption: params.get('encryption') || "none", flow: params.get('flow') || "" }] }] },
            streamSettings: { network: params.get('type') || "tcp", security: params.get('security') || "" }
        };
        if (params.get('security') === 'reality') {
            out.streamSettings.security = "reality";
            out.streamSettings.realitySettings = {
                serverName: params.get('sni') || "",
                publicKey: params.get('pbk') || "",
                shortId: params.get('sid') || "",
                fingerprint: params.get('fp') || "chrome"
            };
        } else if (params.get('security') === 'tls') {
            out.streamSettings.security = "tls";
            out.streamSettings.tlsSettings = { serverName: params.get('sni') || "" };
        }
        if (out.streamSettings.network === 'ws') {
            out.streamSettings.wsSettings = { path: params.get('path') || "/", headers: { Host: params.get('host') || "" } };
        } else if (out.streamSettings.network === 'grpc') {
            out.streamSettings.grpcSettings = { serviceName: params.get('serviceName') || "" };
        }
        return out;
    } catch(e) { return null; }
}

// Проверка, есть ли в JSON уже балансировщик и observatory
function hasBalancerAndObservatory(json) {
    return json.balancers && Array.isArray(json.balancers) && json.balancers.length > 0 &&
           json.observatory && json.observatory.subjectSelector && json.observatory.subjectSelector.length > 0;
}

// Создаёт балансировщик для списка outbound'ов
function wrapWithBalancer(outbounds, remarks) {
    const serverTags = outbounds.map(ob => ob.tag);
    return {
        dns: { port: 53, servers: ["8.8.4.4", "8.8.8.8"], queryStrategy: "UseIPv4" },
        inbounds: [
            { tag: "socks", port: 10808, listen: "127.0.0.1", protocol: "socks", settings: { udp: true, auth: "noauth" }, sniffing: { enabled: true, destOverride: ["http","tls","quic"] } },
            { tag: "http", port: 10809, listen: "127.0.0.1", protocol: "http", settings: { allowTransparent: false }, sniffing: { enabled: true, destOverride: ["http","tls","quic"] } }
        ],
        observatory: {
            enableConcurrency: true,
            probeInterval: "1m",
            probeUrl: "https://www.google.com/generate_204",
            subjectSelector: serverTags.slice()
        },
        outbounds: [
            ...outbounds,
            { tag: "direct", protocol: "freedom" },
            { tag: "block", protocol: "blackhole" }
        ],
        remarks: remarks,
        routing: {
            domainMatcher: "hybrid",
            domainStrategy: "IPIfNonMatch",
            balancers: [{
                tag: "balancer_main",
                selector: serverTags,
                fallbackTag: serverTags[0] || "direct",
                strategy: { type: "leastLoad", settings: { baselines: ["2000ms"], costs: serverTags.map((t,i) => ({ match: t, regexp: false, value: i===0 ? 1 : 1000000 })), expected: 1, maxRTT: "6s" } }
            }],
            rules: [
                { type: "field", protocol: ["bittorrent"], outboundTag: "block" },
                { domain: ["domain:mtalk.google.com","domain:push.apple.com","domain:api.push.apple.com"], outboundTag: "direct", type: "field" },
                { ip: ["17.0.0.0/8"], outboundTag: "direct", type: "field" },
                { type: "field", inboundTag: ["socks","http"], network: "tcp,udp", balancerTag: "balancer_main" }
            ]
        }
    };
}

// --- Обработка одного источника ---
async function processSource(source, nameHint, outputFileName) {
    let outbounds = [];
    let remarks = nameHint;

    // Если source — это VLESS URI
    if (typeof source === 'string' && source.startsWith('vless://')) {
        const ob = parseVlessUri(source, nameHint);
        if (ob) outbounds.push(ob);
    }
    // Если source — URL (подписка)
    else if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
        try {
            const resp = await fetch(source);
            const text = await resp.text();
            const lines = text.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('vless://')) {
                    const ob = parseVlessUri(line, '');
                    if (ob) outbounds.push(ob);
                }
            }
            remarks = remarks || path.basename(new URL(source).pathname) || 'remote';
        } catch(e) { console.error(`Ошибка загрузки ${source}:`, e.message); }
    }
    // Если source — путь к локальному файлу
    else if (typeof source === 'string' && (source.endsWith('.json') || source.endsWith('.txt'))) {
        const content = await fs.readFile(source, 'utf-8');
        if (source.endsWith('.json')) {
            const json = JSON.parse(content);
            remarks = json.remarks || json.name || path.basename(source, '.json');
            if (hasBalancerAndObservatory(json)) {
                // Уже хороший конфиг — сохраняем как есть
                await fs.writeFile(path.join(OUTPUT_DIR, outputFileName), JSON.stringify(json, null, 2));
                console.log(`✅ Сохранён готовый балансирующий конфиг: ${outputFileName}`);
                return;
            }
            if (json.outbounds && Array.isArray(json.outbounds)) {
                for (const ob of json.outbounds) {
                    if (ob.protocol === 'vless' && ob.settings?.vnext?.[0]?.users?.[0]?.id)
                        outbounds.push(ob);
                }
            }
        } else {
            // текстовый файл со списком URI
            const lines = content.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('vless://')) {
                    const ob = parseVlessUri(line, '');
                    if (ob) outbounds.push(ob);
                }
            }
            remarks = remarks || path.basename(source, '.txt');
        }
    }

    if (outbounds.length === 0) {
        console.log(`⚠️ В источнике ${nameHint} нет валидных серверов.`);
        return;
    }

    let finalConfig;
    if (outbounds.length === 1) {
        // Одиночный сервер — простой JSON без балансировщика (Happ покажет один сервер)
        finalConfig = {
            dns: { port: 53, servers: ["8.8.4.4","8.8.8.8"], queryStrategy: "UseIPv4" },
            inbounds: [ /* ... как выше ... */ ],
            outbounds: [...outbounds, { tag: "direct", protocol: "freedom" }, { tag: "block", protocol: "blackhole" }],
            remarks: remarks,
            routing: {
                domainStrategy: "IPIfNonMatch",
                rules: [
                    { type: "field", protocol: ["bittorrent"], outboundTag: "block" },
                    { domain: ["domain:mtalk.google.com","domain:push.apple.com"], outboundTag: "direct", type: "field" },
                    { ip: ["17.0.0.0/8"], outboundTag: "direct", type: "field" },
                    { type: "field", inboundTag: ["socks","http"], outboundTag: outbounds[0].tag }
                ]
            }
        };
    } else {
        // Несколько серверов — создаём балансировщик
        finalConfig = wrapWithBalancer(outbounds, remarks);
    }

    await fs.writeFile(path.join(OUTPUT_DIR, outputFileName), JSON.stringify(finalConfig, null, 2));
    console.log(`✅ Создан профиль: ${outputFileName} (${outbounds.length} серверов, ${outbounds.length > 1 ? 'балансировщик добавлен' : 'одиночный'})`);
}

// --- Главная ---
async function main() {
    await ensureDir(OUTPUT_DIR);
    console.log("🚀 Обработка источников...\n");

    // 1. Обрабатываем внешние VLESS-ссылки как отдельные профили
    for (let i = 0; i < EXTERNAL_SOURCES.length; i++) {
        const src = EXTERNAL_SOURCES[i];
        if (src.startsWith('vless://')) {
            const name = decodeURIComponent(src.split('#')[1] || `external_${i}`);
            const fileName = `${name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_')}.json`;
            await processSource(src, name, fileName);
        } else if (src.startsWith('http')) {
            const fileName = `sub_${i}.json`;
            await processSource(src, `subscription_${i}`, fileName);
        }
    }

    // 2. Обрабатываем локальные файлы из папки sources
    try {
        const files = await fs.readdir(LOCAL_SOURCES_DIR);
        for (const file of files) {
            if (file === '.gitkeep') continue;
            const fullPath = path.join(LOCAL_SOURCES_DIR, file);
            const stat = await fs.stat(fullPath);
            if (!stat.isFile()) continue;
            const ext = path.extname(file).toLowerCase();
            if (ext === '.json' || ext === '.txt') {
                const baseName = path.basename(file, ext);
                const outName = `${baseName}_fixed.json`;
                await processSource(fullPath, baseName, outName);
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') console.error(err);
        else console.log(`Папка ${LOCAL_SOURCES_DIR} не найдена`);
    }

    console.log("\n✅ Готово! Все профили лежат в папке output/");
    console.log("Импортируйте каждый JSON-файл в Happ — они будут отображаться как один сервер с автовыбором.");
}

main().catch(console.error);
