import log from './logger.js';

export class ProxyManager {
    constructor(proxies = []) {
        this.proxies = proxies;
        this.failedProxies = new Set();
    }

    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        
        // Filter out failed proxies
        const availableProxies = this.proxies.filter(p => !this.failedProxies.has(p));
        if (availableProxies.length === 0) {
            // Reset failed proxies if all proxies are failed
            this.failedProxies.clear();
            log.warn("🔄 All proxies failed, resetting failed proxies list");
            return this.getRandomProxy();
        }

        // Get random proxy
        const randomIndex = Math.floor(Math.random() * availableProxies.length);
        return availableProxies[randomIndex];
    }

    markProxyAsFailed(proxy) {
        if (!proxy) return;
        this.failedProxies.add(proxy);
        log.warn(`⚠️ Marked proxy as failed: ${proxy.split("@").pop()}`); // Hide credentials in logs
    }

    getProxyStatus() {
        return {
            total: this.proxies.length,
            available: this.proxies.length - this.failedProxies.size,
            failed: this.failedProxies.size
        };
    }
} 