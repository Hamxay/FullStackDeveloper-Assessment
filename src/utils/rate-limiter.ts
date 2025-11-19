import { RateLimitInfo } from '../types';

export class RateLimiter {
  private requests: Map<string, RateLimitInfo[]>;
  private maxRequestsPerMinute: number;
  private burstCapacity: number;
  private burstWindow: number; // in milliseconds

  constructor(
    maxRequestsPerMinute: number = 10,
    burstCapacity: number = 5,
    burstWindow: number = 10000
  ) {
    this.requests = new Map();
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.burstCapacity = burstCapacity;
    this.burstWindow = burstWindow;
    
    // Cleanup old entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  isAllowed(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    let userRequests = this.requests.get(identifier) || [];

    // Remove old requests outside the 1-minute window
    userRequests = userRequests.filter(
      req => now - req.resetTime < 60000
    );

    // Check burst limit (last 10 seconds)
    const recentRequests = userRequests.filter(
      req => now - req.resetTime < this.burstWindow
    );

    if (recentRequests.length >= this.burstCapacity) {
      const oldestRecentRequest = recentRequests[0];
      const resetTime = oldestRecentRequest.resetTime + this.burstWindow;
      this.requests.set(identifier, userRequests);
      return { allowed: false, resetTime };
    }

    // Check per-minute limit
    if (userRequests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = userRequests[0];
      const resetTime = oldestRequest.resetTime + 60000;
      this.requests.set(identifier, userRequests);
      return { allowed: false, resetTime };
    }

    // Allow request
    userRequests.push({
      count: 1,
      resetTime: now,
    });

    this.requests.set(identifier, userRequests);
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

