import WebSocket from 'ws';
import log from '../utils/logger.js';
import { wsHeaders } from '../config/headers.js';
import { API_ENDPOINTS } from '../config/api.js';
import { newAgent } from '../utils/proxy.js';

class WebSocketClient {
    constructor(token, proxy = null, uuid, reconnectInterval = 5000) {
        this.token = token;
        this.proxy = proxy;
        this.socket = null;
        this.reconnectInterval = reconnectInterval;
        this.shouldReconnect = true;
        this.agent = newAgent(proxy)
        this.uuid = uuid;
        this.url = API_ENDPOINTS.WS_CONNECT(this.uuid);
        this.regNode = `40{"token":"Bearer ${this.token}"}`;
        this.headers = wsHeaders;
    }

    connect() {
        if (!this.uuid || !this.url) {
            log.error("❌ Cannot connect: Node is not registered");
            return;
        }

        const shortNodeId = this.uuid.substring(0, 8);
        log.info(`🔄 Attempting to connect node: ${shortNodeId}`);
        this.socket = new WebSocket(this.url, { headers: this.headers, agent: this.agent });

        this.socket.onopen = () => {
            log.info(`✅ [Node ${shortNodeId}] WebSocket connection successful`);
            this.reply(this.regNode);
        };

        this.socket.onmessage = (event) => {
            if (event.data === "2" || event.data === "41") {
                this.socket.send("3");
            } else if (!event.data.includes("sid")) {
                log.info(`📨 [Node ${shortNodeId}] Message received: ${event.data}`);
            }
        };

        this.socket.onclose = () => {
            log.warn(`⚠️ [Node ${shortNodeId}] Connection closed`);
            if (this.shouldReconnect) {
                log.warn(`🔄 [Node ${shortNodeId}] Reconnecting in ${this.reconnectInterval / 1000} seconds`);
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };

        this.socket.onerror = (error) => {
            log.error(`❌ [Node ${shortNodeId}] Error: ${error.message}`);
            this.socket.close();
        };
    }

    reply(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(String(message));
            if (!message.includes("token")) {
                const shortNodeId = this.uuid.substring(0, 8);
                log.info(`📤 [Node ${shortNodeId}] Sending message: ${message}`);
            }
        } else {
            log.error("❌ Cannot send message: WebSocket not connected");
        }
    }

    disconnect() {
        this.shouldReconnect = true;
        if (this.socket) {
            this.socket.close();
        }
    }
}

export default WebSocketClient;
