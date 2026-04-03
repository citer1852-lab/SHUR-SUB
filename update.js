const fs = require('fs').promises;

async function main() {
    console.log('🚀 Запуск сборки подписки...');
    
    // Тестовые конфиги (потом замените на свои)
    const testConfigs = [
        "vless://example@example.com:443?encryption=none#Test1",
        "trojan://password@example.com:443?security=tls#Test2"
    ];
    
    const plainText = testConfigs.join('\n');
    const base64Data = Buffer.from(plainText, 'utf-8').toString('base64');
    
    await fs.writeFile('sub.txt', base64Data);
    
    const outputJson = {
        lastUpdated: new Date().toISOString(),
        totalUris: testConfigs.length,
        configsBase64: base64Data,
        configsPlain: plainText
    };
    await fs.writeFile('subscription.json', JSON.stringify(outputJson, null, 2));
    
    console.log('✅ Подписка создана!');
    console.log(`📄 sub.txt размер: ${base64Data.length} символов`);
}

main().catch(e => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
});
