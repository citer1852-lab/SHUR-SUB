// update.js
const fs = require('fs').promises;

async function main() {
    console.log('🚀 Запуск сборки подписки...');
    
    // Здесь будут ваши конфиги. Пока добавим тестовые.
    const testConfigs = [
        "vless://example@example.com:443?encryption=none#TestServer1",
        "trojan://password@example.com:443?security=tls#TestServer2",
        "vmess://eyJ2IjoiMiIsInBzIjoiVGVzdCBTZXJ2ZXIiLCJhZGQiOiJleGFtcGxlLmNvbSIsInBvcnQiOiI0NDMiLCJpZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsImFpZCI6IjAiLCJuZXQiOiJ3cyIsInR5cGUiOiJub25lIiwiaG9zdCI6IiIsInBhdGgiOiIvIiwidGxzIjoiIn0="
    ];
    
    // Преобразуем в base64
    const plainText = testConfigs.join('\n');
    const base64Data = Buffer.from(plainText, 'utf-8').toString('base64');
    
    // Сохраняем файлы
    await fs.writeFile('sub.txt', base64Data);
    
    const outputJson = {
        lastUpdated: new Date().toISOString(),
        totalUris: testConfigs.length,
        configsBase64: base64Data,
        configsPlain: plainText
    };
    await fs.writeFile('subscription.json', JSON.stringify(outputJson, null, 2));
    
    console.log('✅ Подписка успешно создана!');
    console.log(`📄 sub.txt размер: ${base64Data.length} символов`);
}

main().catch(e => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
});
