const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_TXT = 'sub.txt';

// ==================== ПРАВИЛА СОРТИРОВКИ ====================
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
// ============================================================

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
    console.log('🔄 Сборка подписки (целые JSON-конфиги) с сортировкой...');

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
        console.log(`⚠️ В папке ${SOURCES_DIR} нет JSON-файлов.`);
        process.exit(0);
    }

    const items = [];
    for (const file of jsonFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const config = JSON.parse(content);
            let remarks = config.remarks || path.basename(file, '.json');
            remarks = remarks.replace(/\0/g, '').trim();
            items.push({
                config,
                remarks,
                originalName: path.basename(file)
            });
            console.log(`📁 ${path.basename(file)} -> remarks: "${remarks}"`);
        } catch (err) {
            console.error(`❌ Ошибка в файле ${file}: ${err.message}`);
        }
    }

    items.sort((a, b) => {
        const prioA = getSortPriority(a.remarks);
        const prioB = getSortPriority(b.remarks);
        if (prioA !== prioB) return prioA - prioB;
        return a.remarks.localeCompare(b.remarks);
    });
    console.log(`\n📊 Сортировка выполнена`);

    const sortedConfigs = items.map(item => item.config);
    // Используем объект { configs: [...] } – подходит для Hiddify / Nekoray / Karing
    const subscription = { configs: sortedConfigs };
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscription, null, 2));
    const base64Content = Buffer.from(JSON.stringify(subscription), 'utf-8').toString('base64');
    await fs.writeFile(OUTPUT_TXT, base64Content);

    console.log(`\n✅ Готово! Сохранено ${sortedConfigs.length} конфигов.`);
    console.log(`📄 ${OUTPUT_JSON} — объект { "configs": [...] }`);
    console.log(`📄 ${OUTPUT_TXT} — base64 (для обратной совместимости)`);
    console.log(`\n🔗 Ссылка для импорта (jsDelivr CDN):`);
    console.log(`   https://cdn.jsdelivr.net/gh/citer1852-lab/SHUR-SUB@main/subscription.json`);
    console.log(`   (замените citer1852-lab/SHUR-SUB на ваш репозиторий)`);
}

main().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
