const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_TXT = 'sub.txt';

// Приоритеты (как у вас в старом коде)
const COUNTRY_PRIORITY = [
    "россия", "russia", "🇷🇺",
    "германия", "germany", "🇩🇪",
    "нидерланды", "netherlands", "🇳🇱",
    "франция", "france", "🇫🇷",
    "сингапур", "singapore", "🇸🇬",
    "гонконг", "hong kong", "🇭🇰",
    "сша", "usa", "🇺🇸"
];
const GAMING_KEYWORDS = ["game", "gaming", "игровой"];
const TELEGRAM_KEYWORDS = ["telegram", "телеграм"];
const LOW_PRIORITY_KEYWORDS = [
    "cf cdn ws", "us reality (backup)", "de reality (best dpi bypass)",
    "nl grpc", "proxy-backup", "proxy-main", "stable fallback"
];

function getSortPriority(text) {
    const lower = text.toLowerCase();
    if (lower.includes("free")) return 0;
    if (lower.includes("lte")) return 1;
    for (const kw of GAMING_KEYWORDS) if (lower.includes(kw)) return 2;
    for (const kw of TELEGRAM_KEYWORDS) if (lower.includes(kw)) return 3;
    for (let i = 0; i < COUNTRY_PRIORITY.length; i++) {
        if (lower.includes(COUNTRY_PRIORITY[i].toLowerCase())) return 10 + i;
    }
    for (const kw of LOW_PRIORITY_KEYWORDS) {
        if (lower.includes(kw.toLowerCase())) return 1000;
    }
    return 500;
}

function sortConfigs(configs) {
    return configs.sort((a, b) => {
        const remarksA = a.remarks || a.name || '';
        const remarksB = b.remarks || b.name || '';
        const prioA = getSortPriority(remarksA);
        const prioB = getSortPriority(remarksB);
        if (prioA !== prioB) return prioA - prioB;
        return remarksA.localeCompare(remarksB);
    });
}

async function getAllJsonFiles(dir) {
    let results = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(await getAllJsonFiles(fullPath));
        } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
            results.push(fullPath);
        }
    }
    return results;
}

async function main() {
    console.log('🔄 Обновление подписки...');
    let jsonFiles = [];
    try {
        jsonFiles = await getAllJsonFiles(SOURCES_DIR);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`⚠️ Папка ${SOURCES_DIR} не найдена. Создайте её и добавьте JSON-файлы.`);
            process.exit(0);
        }
        throw err;
    }
    if (jsonFiles.length === 0) {
        console.log(`⚠️ Нет JSON-файлов в ${SOURCES_DIR}`);
        process.exit(0);
    }
    const configs = [];
    for (const file of jsonFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const config = JSON.parse(content);
            configs.push(config);
            console.log(`✅ Загружен: ${path.basename(file)} — remarks: ${config.remarks || 'не указан'}`);
        } catch (err) {
            console.error(`❌ Ошибка в ${file}: ${err.message}`);
        }
    }
    const sorted = sortConfigs(configs);
    const subscription = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        total: sorted.length,
        configs: sorted
    };
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscription, null, 2));
    const base64 = Buffer.from(JSON.stringify(subscription), 'utf-8').toString('base64');
    await fs.writeFile(OUTPUT_TXT, base64);
    console.log(`✅ Готово: ${sorted.length} конфигов, сохранены в ${OUTPUT_JSON} и ${OUTPUT_TXT}`);
}

main().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
