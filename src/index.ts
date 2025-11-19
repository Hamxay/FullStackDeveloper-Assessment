import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { rateLimitMiddleware } from './middleware/rate-limit-middleware';
import { responseTimeMiddleware, setCacheInstance } from './middleware/response-time-middleware';
import usersRouter from './routes/users';
import cacheRouter from './routes/cache';
import monitoringRouter from './routes/monitoring';
import { getCacheInstance } from './routes/users';

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

setCacheInstance(getCacheInstance());

app.use(responseTimeMiddleware);
app.use(rateLimitMiddleware);

app.use('/users', usersRouter);
app.use('/cache', cacheRouter);
app.get('/cache-status', (req: Request, res: Response) => {
  const cache = getCacheInstance();
  const stats = cache.getStats();
  res.json({
    ...stats,
    averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100,
  });
});
app.use('/monitoring', monitoringRouter);

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'User Data API',
    version: '1.0.0',
    endpoints: {
      'GET /users/:id': 'Get user by ID',
      'POST /users': 'Create a new user',
      'GET /cache-status': 'Get cache statistics',
      'DELETE /cache': 'Clear the cache',
      'GET /monitoring/metrics': 'Get performance metrics',
      'GET /monitoring/logs': 'Get recent request logs',
      'GET /health': 'Health check',
    },
  });
});

app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET  /users/:id            - Get user by ID');
  console.log('  POST /users                - Create a new user');
  console.log('  GET  /cache-status          - Get cache statistics');
  console.log('  DELETE /cache              - Clear the cache');
  console.log('  GET  /monitoring/metrics   - Get performance metrics');
  console.log('  GET  /monitoring/logs      - Get recent request logs');
  console.log('  GET  /health               - Health check');
});

