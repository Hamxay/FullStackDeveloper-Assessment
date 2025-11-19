import { Router, Request, Response } from 'express';
import { monitoringService } from '../utils/monitoring';

const router = Router();

router.get('/metrics', (req: Request, res: Response) => {
  const metrics = monitoringService.getMetrics();
  res.json({
    ...metrics,
    averageResponseTime: Math.round(metrics.averageResponseTime * 100) / 100,
    errorRate: Math.round(metrics.errorRate * 100) / 100,
  });
});

router.get('/logs', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const logs = monitoringService.getRecentLogs(limit);
  res.json({
    logs,
    count: logs.length,
  });
});

export default router;

