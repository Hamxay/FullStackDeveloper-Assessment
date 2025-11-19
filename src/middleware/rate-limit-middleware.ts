import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '../utils/rate-limiter';

const rateLimiter = new RateLimiter(10, 5, 10000);

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identifier = req.ip || req.socket.remoteAddress || 'unknown';

  const { allowed, resetTime } = rateLimiter.isAllowed(identifier);

  if (!allowed) {
    const retryAfter = resetTime
      ? Math.ceil((resetTime - Date.now()) / 1000)
      : 60;
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: retryAfter,
    });
    return;
  }

  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', '9');

  next();
}

