const fs = require('fs').promises;
const path = require('path');

const WORKER_URL = 'https://shur-sub.mamasoso1488228.workers.dev/sub';
const OUTPUT_TXT = 'sub.txt';

async function main() {
    // Просто записываем URL в sub.txt
    await fs.writeFile(OUTPUT_TXT, WORKER_URL);
    console.log(`✅ sub.txt создан с ссылкой: ${WORKER_URL}`);
}

main().catch(console.error);
