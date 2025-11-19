import { Router, Request, Response } from 'express';
import { getCacheInstance } from './users';

const router = Router();

router.delete('/', (req: Request, res: Response) => {
  const cache = getCacheInstance();
  cache.clear();
  res.json({
    message: 'Cache cleared successfully',
  });
});

router.get('/status', (req: Request, res: Response) => {
  const cache = getCacheInstance();
  const stats = cache.getStats();
  res.json({
    ...stats,
    averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100,
  });
});

export default router;

