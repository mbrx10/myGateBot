import log from './utils/logger.js';
import cucuSabeni from './utils/banner.js';
import { readFile } from './utils/file.js';
import { AccountManager } from './services/account.js';

async function main() {
    log.info(cucuSabeni);

    const tokens = readFile("tokens.txt");
    const proxies = readFile("proxy.txt");
    let proxyIndex = 0;

    try {
        log.info(`🚀 Starting program with ${tokens.length} accounts...`);
        await Promise.all(tokens.map(async (token, index) => {
            const proxy = proxies.length > 0 ? proxies[proxyIndex] : null;
            if (proxies.length > 0) {
                proxyIndex = (proxyIndex + 1) % proxies.length;
            }

            const account = new AccountManager(token, proxy, index + 1);
            await account.initialize();
        }));

        log.info(`✅ Connection established | 🎮 Program running | ⏰ Waiting for updates...`);
    } catch (error) {
        log.error(`❌ WebSocket Error: ${error.message}`);
    }
}

main();