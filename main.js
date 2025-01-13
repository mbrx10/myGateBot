import log from './utils/logger.js';
import cucuSabeni from './utils/banner.js';
import { readFile } from './utils/file.js';
import { AccountManager } from './services/account.js';
import { ProxyManager } from './utils/proxyManager.js';

async function main() {
    log.info(cucuSabeni);

    const tokens = readFile("tokens.txt");
    const proxies = readFile("proxy.txt");
    const proxyManager = new ProxyManager(proxies);

    try {
        log.info(`🚀 Starting program with ${tokens.length} accounts...`);
        if (proxies.length > 0) {
            log.info(`🌐 Loaded ${proxies.length} proxies`);
        }

        await Promise.all(tokens.map(async (token, index) => {
            const proxy = proxyManager.getRandomProxy();
            const account = new AccountManager(token, proxy, index + 1, proxyManager);
            await account.initialize();
        }));

        log.info(`✅ Connection established | 🎮 Program running | ⏰ Waiting for updates...`);
    } catch (error) {
        log.error(`❌ WebSocket Error: ${error.message}`);
    }
}

main();