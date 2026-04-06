const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const PROFILES_DIR = SOURCES_DIR;
const OUTPUT_TXT = 'sub.txt';

// Замените на ваш репозиторий и ветку, если нужно
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/';

// Функция для безопасного имени файла (латиница, без пробелов)
function safeFilename(remarks, index) {
    let base = remarks || `config_${index}`;
    // Простая транслитерация и замена опасных символов
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
    console.log('🔄 Обновление подписки (отдельные профили)...');

    // Создаём папку profiles (если нет)
    await fs.mkdir(PROFILES_DIR, { recursive: true });

    // Очищаем profiles от старых файлов
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

    const profileUrls = [];
    let index = 1;
    for (const file of jsonFiles) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const config = JSON.parse(content);
            const remarks = config.remarks || '';
            const safeName = safeFilename(remarks, index);
            const destPath = path.join(PROFILES_DIR, safeName);
            await fs.writeFile(destPath, content);
            const rawUrl = GITHUB_RAW_BASE + `profiles/${encodeURIComponent(safeName)}`;
            profileUrls.push(rawUrl);
            console.log(`✅ Профиль ${index}: ${safeName} (remarks: ${remarks || 'без имени'})`);
            index++;
        } catch (err) {
            console.error(`❌ Ошибка в файле ${file}: ${err.message}`);
        }
    }

    // Сохраняем sub.txt как список raw-ссылок (по одной на строку)
    await fs.writeFile(OUTPUT_TXT, profileUrls.join('\n'));

    console.log(`\n✅ Готово! Создано ${profileUrls.length} профилей.`);
    console.log(`📄 ${OUTPUT_TXT} — список ссылок. Импортируйте этот файл как подписку в Hiddify / Nekoray / Karing.`);
    console.log(`\n🔗 Ваша подписка: https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
}

main().catch(err => {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
});
