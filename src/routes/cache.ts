import { Router, Request, Response } from 'express';
import { getCacheInstance } from './users';

const router = Router();

/**
 * DELETE /cache
 * Clear the entire cache
 */
router.delete('/', (req: Request, res: Response) => {
  const cache = getCacheInstance();
  cache.clear();
  res.json({
    message: 'Cache cleared successfully',
  });
});

/**
 * GET /cache-status
 * Get cache statistics
 */
router.get('/status', (req: Request, res: Response) => {
  const cache = getCacheInstance();
  const stats = cache.getStats();
  res.json({
    ...stats,
    averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100, // Round to 2 decimal places
  });
});

export default router;

