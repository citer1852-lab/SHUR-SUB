const fs = require('fs').promises;
const path = require('require');

// ==================== НАСТРОЙКИ ====================
const LOCAL_SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_TXT = 'sub.txt';

// Приоритет стран (чем раньше в списке, тем выше приоритет)
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
// ===================================================

// ----- Функция получения приоритета для строки (remarks) -----
function getSortPriority(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("free")) return 0;
    if (lowerText.includes("lte")) return 1;
    for (const kw of GAMING_KEYWORDS) if (lowerText.includes(kw)) return 2;
    for (const kw of TELEGRAM_KEYWORDS) if (lowerText.includes(kw)) return 3;
    for (let i = 0; i < COUNTRY_PRIORITY.length; i++) {
        if (lowerText.includes(COUNTRY_PRIORITY[i].toLowerCase())) return 10 + i;
    }
    return 500;
}

// ----- Сортировка массива конфигов -----
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

// ----- Рекурсивный обход папки для сбора всех JSON-файлов -----
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

// ----- Основная функция -----
async function main() {
    console.log('🚀 Сборка подписки (целые JSON-конфиги) с сортировкой по remarks\n');

    // 1. Получаем список всех JSON-файлов
    let jsonFiles = [];
    try {
        jsonFiles = await getAllJsonFiles(LOCAL_SOURCES_DIR);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(`📁 Папка ${LOCAL_SOURCES_DIR} не найдена. Создайте её и положите туда JSON-файлы.`);
            return;
        }
        throw err;
    }

    if (jsonFiles.length === 0) {
        console.log(`⚠️ В папке ${LOCAL_SOURCES_DIR} нет JSON-файлов.`);
        return;
    }

    // 2. Загружаем каждый JSON-файл как объект
    const configs = [];
    for (const file of jsonFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const config = JSON.parse(content);
            configs.push(config);
            console.log(`✅ Загружен: ${path.basename(file)} — remarks: ${config.remarks || 'не указан'}`);
        } catch (err) {
            console.error(`❌ Ошибка в файле ${file}: ${err.message}`);
        }
    }

    // 3. Сортируем конфиги
    const sortedConfigs = sortConfigs(configs);
    console.log(`\n📊 Сортировка выполнена (по приоритету: free > LTE > игры > Telegram > страны > остальное > резервные)`);

    // 4. Формируем объект подписки
    const subscription = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        total: sortedConfigs.length,
        configs: sortedConfigs
    };

    // 5. Сохраняем в файлы
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscription, null, 2));
    const base64Content = Buffer.from(JSON.stringify(subscription), 'utf-8').toString('base64');
    await fs.writeFile(OUTPUT_TXT, base64Content);

    console.log(`\n✅ Подписка создана!`);
    console.log(`📄 ${OUTPUT_JSON} (plain JSON, ${JSON.stringify(subscription).length} символов)`);
    console.log(`📄 ${OUTPUT_TXT} (base64, ${base64Content.length} символов)`);
    console.log(`\n🔗 Ссылка для импорта (sub.txt) в Hiddify / Nekoray / Karing:`);
    console.log(`   https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
    console.log(`\n💡 Теперь каждый JSON-конфиг сохраняется целиком (с балансировкой, observatory и т.д.).`);
    console.log(`   Сортировка применена к конфигам на основе поля "remarks".`);
}

main().catch(console.error);
