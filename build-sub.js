const fs = require('fs').promises;
const path = require('path');

const SOURCES_DIR = './sources';
const OUTPUT_JSON = 'subscription.json';
const OUTPUT_BASE64 = 'sub.txt';

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
    console.log('📦 Сборка подписки из JSON-конфигов (сохранение целостности)\n');
    const jsonFiles = await getAllJsonFiles(SOURCES_DIR);
    if (jsonFiles.length === 0) {
        console.log('⚠️ Нет JSON-файлов в папке sources');
        return;
    }
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
    // Формируем объект подписки (можно просто массив, но добавим метаданные)
    const subscription = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        total: configs.length,
        configs: configs
    };
    // Сохраняем как обычный JSON
    await fs.writeFile(OUTPUT_JSON, JSON.stringify(subscription, null, 2));
    // Сохраняем как base64 (для клиентов, ожидающих подписку в base64)
    const base64Content = Buffer.from(JSON.stringify(subscription), 'utf-8').toString('base64');
    await fs.writeFile(OUTPUT_BASE64, base64Content);
    console.log(`\n🎉 Готово! Собрано ${configs.length} конфигов.`);
    console.log(`📄 ${OUTPUT_JSON} — для прямого импорта (JSON).`);
    console.log(`📄 ${OUTPUT_BASE64} — для подписки в base64.`);
    console.log(`\n🔗 Ссылка для импорта в Hiddify / Nekoray / Karing:`);
    console.log(`   https://raw.githubusercontent.com/citer1852-lab/SHUR-SUB/main/sub.txt`);
    console.log(`\n💡 Убедитесь, что ваш клиент поддерживает подписку в формате JSON-массива. Hiddify-next, Nekoray (последние версии) и Karing — поддерживают.`);
}

main().catch(console.error);
