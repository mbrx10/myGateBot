import axios from 'axios';
import { randomUUID } from 'crypto';
import log from '../utils/logger.js';
import { headers } from '../config/headers.js';
import { API_ENDPOINTS } from '../config/api.js';
import { newAgent } from '../utils/proxy.js';
import { RateLimiter } from '../utils/rateLimit.js';

// Global configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds
const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second

export async function registerNode(token, proxy = null, node = null) {
    const agent = newAgent(proxy)
    const maxRetries = 5;
    let retries = 0;
    let uuid = node || randomUUID();
    const activationDate = new Date().toISOString();
    const payload = {
        id: uuid,
        status: "Good",
        activationDate: activationDate,
    };

    while (retries < maxRetries) {
        try {
            await rateLimiter.checkLimit();
            const response = await axios.post(
                API_ENDPOINTS.REGISTER_NODE,
                payload,
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                    timeout: REQUEST_TIMEOUT,
                }
            );

            log.info(`✅ Node ${uuid.substring(0, 8)} registered successfully`);
            return uuid;
        } catch (error) {
            const errorMsg = error.code === 'ECONNABORTED' 
                ? 'Request timeout' 
                : error.message;
            log.error(`❌ Error registering node: ${errorMsg}`);
            retries++;
            if (retries < maxRetries) {
                const waitTime = 10000 * retries; // Exponential backoff
                log.info(`⏳ Retrying in ${waitTime/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                log.error("❌ Max retries exceeded; giving up on registration.");
                return null;
            }
        }
    }
}

export async function confirmUser(token, proxy = null) {
    const agent = newAgent(proxy)
    try {
        const response = await axios.post(
            API_ENDPOINTS.CONFIRM_REFERRAL,
            {},
            {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            }
        );
        log.info("Confirm user response:", response.data);
        return null;
    } catch (error) {
        log.info("confirming user:", error.message);
        return null;
    }
}

export async function getQuestsList(token, proxy = null) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy)

    while (retries < maxRetries) {
        try {
            const response = await axios.get(API_ENDPOINTS.GET_QUESTS, {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            });
            const uncompletedIds = response.data.data.items
                .filter(item => item.status === "UNCOMPLETED")
                .map(item => item._id);
            return uncompletedIds;
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on getting quest info.");
                return { error: error.message };
            }
        }
    }
}

export async function submitQuest(token, proxy = null, questId) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy)
    while (retries < maxRetries) {
        try {
            const response = await axios.post(
                API_ENDPOINTS.SUBMIT_QUEST(questId),
                {},
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );
            log.info("Submit quest response:", response.data);
            return response.data;
        } catch (error) {
            log.error("Error submit quest:", error.message);
            retries++;
            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on getting quest info.");
                return { error: error.message };
            }
        }
    }
}

export async function getUserInfo(token, proxy = null) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy)

    while (retries < maxRetries) {
        try {
            await rateLimiter.checkLimit();
            const response = await axios.get(API_ENDPOINTS.GET_USER_INFO, {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
                timeout: REQUEST_TIMEOUT,
            });
            const { name, status, _id, levels, currentPoint } = response.data.data;
            return { name, status, _id, levels, currentPoint };
        } catch (error) {
            retries++;
            const errorMsg = error.code === 'ECONNABORTED' 
                ? 'Request timeout' 
                : error.message;
            if (retries < maxRetries) {
                const waitTime = 10000 * retries; // Exponential backoff
                log.info(`⏳ Retrying in ${waitTime/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                log.error("❌ Max retries exceeded; giving up on getting user info.");
                return { error: errorMsg };
            }
        }
    }
}

export async function getUserNode(token, proxy = null, index) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy);

    while (retries < maxRetries) {
        try {
            const response = await axios.get(
                API_ENDPOINTS.GET_USER_NODES,
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );

            return response.data.data.items.map(item => item.id);
        } catch (error) {
            retries++;

            if (error.response && error.response.status === 401) {
                log.error(`Account #${index}:`, 'Unauthorized - please update token');
                return null;
            }

            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on getting user nodes.");
                return [];
            }
        }
    }
}

export async function checkQuests(token, proxy = null) {
    log.info('Trying to check for new quests...');
    const questsIds = await getQuestsList(token, proxy);

    if (questsIds && questsIds.length > 0) {
        log.info('Found new uncompleted quests:', questsIds.length);

        for (const questId of questsIds) {
            log.info('Trying to complete quest:', questId);
            try {
                await submitQuest(token, proxy, questId);
                log.info(`Quest ${questId} completed successfully.`);
            } catch (error) {
                log.error(`Error completing quest ${questId}:`, error);
            }
        }
    } else {
        log.info('No new uncompleted quests found.');
    }
}
