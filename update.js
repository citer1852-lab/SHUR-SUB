const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const PROFILES_DIR = './profiles';
const OUTPUT_TXT = 'sub.txt';
const OUTPUT_JSON = 'subscription.json';

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

/**
 * Преобразует строку в безопасное имя файла (латиница, без пробелов, без спецсимволов).
 * Сохраняет расширение .json.
 */
function safeFilenameFromOriginal(originalName, remarks, index) {
    let base = originalName.replace(/\.json$/i, '');
    // Если есть remarks и он не пустой, можно использовать его, но для предсказуемости лучше использовать оригинальное имя
    // По желанию: base = remarks ? remarks.replace(/\0/g, '') : base;
    // Однако по вашей просьбе, чтобы имена соответствовали исходным файлам, оставим оригинальное имя.
    // Но в оригинальных именах могут быть пробелы, эмодзи, русские буквы – их нужно транслитерировать.
    const translit = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
        'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
        'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch',
        'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        '🇷🇺':'ru','🇩🇪':'de','🇳🇱':'nl','🇫🇷':'fr','🇸🇬':'sg','🇭🇰':'hk','🇺🇸':'us',
        ' ':'_', '-':'_'
    };
    let safe = base.toLowerCase();
    for (let [ru, en] of Object.entries(translit)) {
        safe = safe.replace(new RegExp(ru, 'g'), en);
    }
    safe = safe.replace(/[^a-z0-9_\-]/g, '_');
    safe = safe.replace(/_+/g, '_');
    if (safe.length > 50) safe = safe.substring(0, 50);
    // Убираем начальные и конечные подчёркивания
    safe = safe.replace(/^_+|_+$/g, '');
    if (!safe) safe = `config_${index}`;
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
    console.log('🔄 Сборка подписки с сохранением исходных имён файлов...');

    await fs.mkdir(PROFILES_DIR, { recursive: true });
    // Очищаем profiles
    const oldFiles = await fs.readdir(PROFILES_DIR);
    for (const file of oldFiles) {
        await fs.unlink(path.join(PROFILES_DIR, file));
    }

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
            let remarks = config.remarks || '';
            remarks = remarks.replace(/\0/g, '').trim();
            const originalName = path.basename(file);
            items.push({
                originalPath: file,
                originalName: originalName,
                content: content,
                remarks: remarks,
                config: config
            });
            console.log(`📁 Загружен: ${originalName} -> remarks: "${remarks || '(нет)'}"`);
        } catch (err) {
            console.error(`❌ Ошибка в файле ${file}: ${err.message}`);
        }
    }

    // Сортировка
    items.sort((a, b) => {
        const prioA = getSortPriority(a.remarks || a.originalName);
        const prioB = getSortPriority(b.remarks || b.originalName);
        if (prioA !== prioB) return prioA - prioB;
        return (a.remarks || a.originalName).localeCompare(b.remarks || b.originalName);
    });
    console.log(`\n📊 Сортировка выполнена`);

    const profileUrls = [];
    let index = 1;
    for (const item of items) {
        const safeName = safeFilenameFromOriginal(item.originalName, item.remarks, index);
        const destPath = path.join(PROFILES_DIR, safeName);
        await fs.writeFile(destPath, item.content);
        const rawUrl = GITHUB_RAW_BASE + `profiles/${encodeURIComponent(safeName)}`;
        profileUrls.push(rawUrl);
        console.log(`✅ Профиль ${index}: ${safeName} (основа: ${item.originalName})`);
        index++;
    }

    await fs.writeFile(OUTPUT_TXT, profileUrls.join('\n'));
    const subscriptionInfo = {
        lastUpdated: new Date().toISOString(),
        total: profileUrls.length,
        profiles: items.map((item, i) => ({
            originalName: item.originalName,
            remarks: item.remarks,
            url: profileUrls[i]
        }))
    };
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscriptionInfo, null, 2));

    console.log(`\n✅ Готово! Создано ${profileUrls.length} профилей.`);
    console.log(`📄 ${OUTPUT_TXT} — подписка (список ссылок).`);
    console.log(`🔗 Ваша подписка: https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
}

main().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
