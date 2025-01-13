import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const newAgent = (proxy = null) => {
    if (proxy && proxy.startsWith('http://')) {
        const agent = new HttpsProxyAgent(proxy);
        return agent;
    } else if (proxy && proxy.startsWith('socks4://')) {
        const agent = new SocksProxyAgent(proxy);
        return agent;
    } else if (proxy && proxy.startsWith('socks5://')) {
        const agent = new SocksProxyAgent(proxy);
        return agent;
    } else {
        return null;
    }
};