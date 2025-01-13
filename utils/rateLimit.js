export class RateLimiter {
    constructor(tokens = 10, interval = 1000) {
        this.tokens = tokens;
        this.interval = interval;
        this.lastRefill = Date.now();
        this.available = tokens;
    }

    async checkLimit() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = Math.floor(timePassed / this.interval) * this.tokens;
        
        if (tokensToAdd > 0) {
            this.available = Math.min(this.tokens, this.available + tokensToAdd);
            this.lastRefill = now;
        }

        if (this.available <= 0) {
            // Wait for next token
            const waitTime = this.interval - (now - this.lastRefill);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.checkLimit();
        }

        this.available--;
        return true;
    }
} 