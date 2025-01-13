import log from '../utils/logger.js';
import WebSocketClient from './websocket.js';
import { 
    registerNode, 
    confirmUser, 
    getUserInfo, 
    getUserNode, 
    checkQuests 
} from './api.js';

export class AccountManager {
    constructor(token, proxy, accountIndex, proxyManager) {
        this.token = token;
        this.proxy = proxy;
        this.accountIndex = accountIndex;
        this.proxyManager = proxyManager;
        this.nodes = [];
        this.wsClients = [];
        this.intervals = new Set();
    }

    async handleProxyFailure() {
        if (!this.proxy) return null;
        
        this.proxyManager.markProxyAsFailed(this.proxy);
        this.proxy = this.proxyManager.getRandomProxy();
        log.info(`🔄 [Account #${this.accountIndex}] Switching to new proxy: ${this.proxy ? this.proxy.split("@").pop() : 'Direct Connection'}`);
        return this.proxy;
    }

    async initialize() {
        try {
            log.info(`🔍 [Account #${this.accountIndex}] Searching for registered nodes...`);
            this.nodes = await getUserNode(this.token, this.proxy, this.accountIndex).catch(async error => {
                if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                    this.proxy = await this.handleProxyFailure();
                    return getUserNode(this.token, this.proxy, this.accountIndex);
                }
                throw error;
            });
            
            if (!this.nodes) return false;
            
            if (this.nodes.length === 0) {
                log.info(`🌱 [Account #${this.accountIndex}] No nodes found, creating new node...`);
                const uuid = await registerNode(this.token, this.proxy).catch(async error => {
                    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                        this.proxy = await this.handleProxyFailure();
                        return registerNode(this.token, this.proxy);
                    }
                    throw error;
                });

                if (!uuid) {
                    log.error(`❌ [Account #${this.accountIndex}] Failed to register node - skipping WebSocket connection.`);
                    return false;
                }
                this.nodes = [uuid];
            } else {
                log.info(`✨ [Account #${this.accountIndex}] Found ${this.nodes.length} active nodes!`);
                await Promise.all(this.nodes.map(node => 
                    registerNode(this.token, this.proxy, node).catch(async error => {
                        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                            this.proxy = await this.handleProxyFailure();
                            return registerNode(this.token, this.proxy, node);
                        }
                        throw error;
                    })
                ));
            }

            await this.setupServices();
            return true;
        } catch (error) {
            log.error(`💥 [Account #${this.accountIndex}] Initialization error: ${error.message}`);
            return false;
        }
    }

    async setupServices() {
        // Setup user confirmation
        await confirmUser(this.token, this.proxy);

        // Setup periodic user info check
        this.setupUserInfoInterval();

        // Setup WebSocket connections
        await this.setupWebSocketConnections();

        // Setup quest checking
        await this.setupQuestChecking();

        // Get initial user info
        await this.logUserInfo();
    }

    setupUserInfoInterval() {
        const interval = setInterval(async () => {
            const users = await getUserInfo(this.token);
            log.info(`📊 [Account #${this.accountIndex}] Update: ${this.nodes.length} Node | ${users.name} | Level ${users.levels} | ${users.currentPoint} Points`);
        }, 11 * 60 * 1000);
        this.intervals.add(interval);
    }

    async setupWebSocketConnections() {
        await Promise.all(this.nodes.map(node => {
            const shortNodeId = node.substring(0, 8);
            log.info(`🔌 [Account #${this.accountIndex}] Creating new connection using ${this.proxy ? '🔒 Proxy' : '🌐 Direct Connection'}`);
            const client = new WebSocketClient(this.token, this.proxy, node);
            client.connect();
            this.wsClients.push(client);

            const interval = setInterval(() => {
                log.info(`🔄 [Account #${this.accountIndex}] Refreshing node ${shortNodeId} connection...`);
                client.disconnect();
            }, 10 * 60 * 1000);
            this.intervals.add(interval);
        }));
    }

    async setupQuestChecking() {
        await checkQuests(this.token, this.proxy);
        const interval = setInterval(async () => {
            try {
                log.info(`🎯 [Account #${this.accountIndex}] Checking for new quests...`);
                await checkQuests(this.token, this.proxy);
            } catch (error) {
                log.error(`⚠️ [Account #${this.accountIndex}] Failed to check quests: ${error.message}`);
            }
        }, 24 * 60 * 60 * 1000);
        this.intervals.add(interval);
    }

    async logUserInfo() {
        const users = await getUserInfo(this.token, this.proxy);
        log.info(`📱 [Account #${this.accountIndex}] Info: ${this.nodes.length} Node | ${users.name} | Level ${users.levels} | ${users.currentPoint} Points`);
    }

    async cleanup() {
        log.info(`🧹 [Account #${this.accountIndex}] Starting cleanup...`);
        
        // Clear all intervals
        for (const interval of this.intervals) {
            clearInterval(interval);
        }
        this.intervals.clear();
        
        // Cleanup WebSocket connections
        await Promise.all(this.wsClients.map(async client => {
            client.shouldReconnect = false; // Prevent auto reconnect
            return new Promise(resolve => {
                if (client.socket) {
                    client.socket.once('close', resolve);
                    client.disconnect();
                } else {
                    resolve();
                }
            });
        }));
        
        this.wsClients = [];
        this.nodes = [];
        
        log.info(`✨ [Account #${this.accountIndex}] Cleanup completed`);
    }
} 