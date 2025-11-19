import { RateLimitInfo } from '../types';

export class RateLimiter {
  private requests: Map<string, RateLimitInfo[]>;
  private maxRequestsPerMinute: number;
  private burstCapacity: number;
  private burstWindow: number;

  constructor(
    maxRequestsPerMinute: number = 10,
    burstCapacity: number = 5,
    burstWindow: number = 10000
  ) {
    this.requests = new Map();
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.burstCapacity = burstCapacity;
    this.burstWindow = burstWindow;
    
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  isAllowed(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    let requests = this.requests.get(identifier) || [];

    requests = requests.filter(req => now - req.resetTime < 60000);

    const recent = requests.filter(req => now - req.resetTime < this.burstWindow);

    if (recent.length >= this.burstCapacity) {
      const resetTime = recent[0].resetTime + this.burstWindow;
      this.requests.set(identifier, requests);
      return { allowed: false, resetTime };
    }

    if (requests.length >= this.maxRequestsPerMinute) {
      const resetTime = requests[0].resetTime + 60000;
      this.requests.set(identifier, requests);
      return { allowed: false, resetTime };
    }

    requests.push({ count: 1, resetTime: now });
    this.requests.set(identifier, requests);
    return { allowed: true };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        req => now - req.resetTime < 60000
      );
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

