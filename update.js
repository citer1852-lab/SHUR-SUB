const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const PROFILES_DIR = './profiles';
const OUTPUT_TXT = 'sub.txt';
const OUTPUT_JSON = 'subscription.json'; // опционально, для информации

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/';

// ==================== ПРАВИЛА СОРТИРОВКИ (как в вашем старом коде) ====================
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
// =====================================================================

function safeFilename(remarks, index) {
    let base = remarks || `config_${index}`;
    const translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
        'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
        'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch',
        'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        '🇷🇺':'ru','🇩🇪':'de','🇳🇱':'nl','🇫🇷':'fr','🇸🇬':'sg','🇭🇰':'hk','🇺🇸':'us'
    };
    let safe = base.toLowerCase();
    for (let [ru, en] of Object.entries(translit)) {
        safe = safe.replace(new RegExp(ru, 'g'), en);
    }
    safe = safe.replace(/[^a-z0-9_\-]/g, '_');
    safe = safe.replace(/_+/g, '_');
    if (safe.length > 50) safe = safe.substring(0, 50);
    return `${safe}.json`;
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
    console.log('🔄 Обновление подписки с сортировкой (отдельные профили)...');

    // Создаём папку profiles
    await fs.mkdir(PROFILES_DIR, { recursive: true });

    // Очищаем profiles
    const oldFiles = await fs.readdir(PROFILES_DIR);
    for (const file of oldFiles) {
        await fs.unlink(path.join(PROFILES_DIR, file));
    }

    // Получаем все JSON из sources
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

    // Загружаем конфиги и извлекаем remarks
    const configs = [];
    for (const file of jsonFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const config = JSON.parse(content);
            const remarks = config.remarks || path.basename(file, '.json');
            configs.push({
                path: file,
                content: content,
                remarks: remarks,
                config: config
            });
            console.log(`📁 Загружен: ${path.basename(file)} -> remarks: "${remarks}"`);
        } catch (err) {
            console.error(`❌ Ошибка в файле ${file}: ${err.message}`);
        }
    }

    // Сортируем по приоритету (как в старом коде)
    configs.sort((a, b) => {
        const prioA = getSortPriority(a.remarks);
        const prioB = getSortPriority(b.remarks);
        if (prioA !== prioB) return prioA - prioB;
        return a.remarks.localeCompare(b.remarks);
    });
    console.log(`\n📊 Сортировка выполнена (по приоритету: free > LTE > игры > Telegram > страны > остальное > резервные)`);

    // Создаём профили и список ссылок
    const profileUrls = [];
    let index = 1;
    for (const item of configs) {
        const safeName = safeFilename(item.remarks, index);
        const destPath = path.join(PROFILES_DIR, safeName);
        await fs.writeFile(destPath, item.content);
        const rawUrl = GITHUB_RAW_BASE + `profiles/${encodeURIComponent(safeName)}`;
        profileUrls.push(rawUrl);
        console.log(`✅ Профиль ${index}: ${safeName} (приоритет: ${getSortPriority(item.remarks)})`);
        index++;
    }

    // Сохраняем sub.txt как список ссылок в отсортированном порядке
    await fs.writeFile(OUTPUT_TXT, profileUrls.join('\n'));

    // Также создаём subscription.json для информации (необязательно)
    const subscriptionInfo = {
        lastUpdated: new Date().toISOString(),
        total: profileUrls.length,
        profiles: configs.map((item, i) => ({
            remarks: item.remarks,
            url: profileUrls[i]
        }))
    };
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscriptionInfo, null, 2));

    console.log(`\n✅ Готово! Создано ${profileUrls.length} профилей.`);
    console.log(`📄 ${OUTPUT_TXT} — список ссылок (отсортированный).`);
    console.log(`📄 ${OUTPUT_JSON} — информация о подписке.`);
    console.log(`\n🔗 Ваша подписка: https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
}

main().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
