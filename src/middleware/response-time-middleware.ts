import { Request, Response, NextFunction } from 'express';
import { LRUCache } from '../utils/lru-cache';
import { User } from '../types';
import { monitoringService } from '../utils/monitoring';

let cacheInstance: LRUCache<User> | null = null;

export function setCacheInstance(cache: LRUCache<User>): void {
  cacheInstance = cache;
}

// Extend Request interface to include cache status
declare global {
  namespace Express {
    interface Request {
      _cached?: boolean;
    }
  }
}

export function responseTimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (cacheInstance) {
      cacheInstance.recordResponseTime(duration);
    }
    
    // Record in monitoring service
    monitoringService.recordRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      req._cached || false
    );
  });

  next();
}

