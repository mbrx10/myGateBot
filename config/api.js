const BASE_URL = 'https://api.mygate.network';
const WS_URL = 'wss://api.mygate.network';

export const API_ENDPOINTS = {
    // WebSocket endpoint
    WS_CONNECT: (nodeId) => `${WS_URL}/socket.io/?nodeId=${nodeId}&EIO=4&transport=websocket`,
    
    // Node endpoints
    REGISTER_NODE: `${BASE_URL}/api/front/nodes`,
    GET_USER_NODES: `${BASE_URL}/api/front/nodes?limit=10&page=1`,
    
    // User endpoints
    GET_USER_INFO: `${BASE_URL}/api/front/users/me`,
    CONFIRM_REFERRAL: `${BASE_URL}/api/front/referrals/referral/LfBWAQ`,
    
    // Quest endpoints
    GET_QUESTS: `${BASE_URL}/api/front/achievements/ambassador`,
    SUBMIT_QUEST: (questId) => `${BASE_URL}/api/front/achievements/ambassador/${questId}/submit`,
};
