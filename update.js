const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const OUTPUT_TXT = 'sub.txt';
const OUTPUT_JSON = 'subscription.json';

// Базовый URL raw-контента (замените, если репозиторий другой)
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/';

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

// Рекурсивный сбор всех JSON-файлов в папке sources
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
    console.log('🔄 Сборка подписки из папки sources с сортировкой...');

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

    // Загружаем каждый файл, читаем remarks
    const items = [];
    for (const file of jsonFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const config = JSON.parse(content);
            let remarks = config.remarks || '';
            remarks = remarks.replace(/\0/g, '').trim();
            // Относительный путь от корня репозитория (например, sources/xxx.json)
            const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
            items.push({
                relativePath,
                remarks,
                originalName: path.basename(file)
            });
            console.log(`📁 ${relativePath} -> remarks: "${remarks || '(нет)'}"`);
        } catch (err) {
            console.error(`❌ Ошибка в ${file}: ${err.message}`);
        }
    }

    // Сортировка по приоритету (remarks или имя файла)
    items.sort((a, b) => {
        const sortA = a.remarks || a.originalName;
        const sortB = b.remarks || b.originalName;
        const prioA = getSortPriority(sortA);
        const prioB = getSortPriority(sortB);
        if (prioA !== prioB) return prioA - prioB;
        return sortA.localeCompare(sortB);
    });
    console.log(`\n📊 Сортировка выполнена`);

    // Формируем список raw-ссылок
    const profileUrls = items.map(item => GITHUB_RAW_BASE + item.relativePath);
    await fs.writeFile(OUTPUT_TXT, profileUrls.join('\n'));

    // Дополнительная информация (необязательно)
    const subscriptionInfo = {
        lastUpdated: new Date().toISOString(),
        total: profileUrls.length,
        profiles: items.map((item, i) => ({
            file: item.relativePath,
            remarks: item.remarks,
            url: profileUrls[i]
        }))
    };
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscriptionInfo, null, 2));

    console.log(`\n✅ Готово! Создано ${profileUrls.length} ссылок.`);
    console.log(`📄 ${OUTPUT_TXT} — подписка (список raw-ссылок на JSON-файлы в sources).`);
    console.log(`🔗 Ссылка на подписку: https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
}

main().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
