import { Router, Request, Response } from 'express';
import { LRUCache } from '../utils/lru-cache';
import { AsyncQueue } from '../utils/async-queue';
import { fetchUserFromDatabase, addUserToDatabase, getAllUsers } from '../utils/mock-database';
import { User } from '../types';

const router = Router();
const cache = new LRUCache<User>(60000);
const asyncQueue = new AsyncQueue();

let cacheInstance: LRUCache<User> | null = null;

export function getCacheInstance(): LRUCache<User> {
  if (!cacheInstance) {
    cacheInstance = cache;
  }
  return cacheInstance;
}

router.get('/:id', async (req: Request, res: Response) => {
  const start = Date.now();
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId)) {
    return res.status(400).json({
      error: 'Invalid user ID',
      message: 'User ID must be a valid number',
    });
  }

  const key = `user:${userId}`;
  const cached = cache.get(key);

  if (cached) {
    const time = Date.now() - start;
    cache.recordResponseTime(time);
    req._cached = true;
    return res.json({
      ...cached,
      _cached: true,
      _responseTime: time,
    });
  }

  try {
    const user = await asyncQueue.enqueue(userId, fetchUserFromDatabase);
    
    if (!cache.has(key)) {
      cache.set(key, user);
    }

    const time = Date.now() - start;
    cache.recordResponseTime(time);
    req._cached = false;
    res.json({
      ...user,
      _cached: false,
      _responseTime: time,
    });
  } catch (error) {
    const time = Date.now() - start;
    cache.recordResponseTime(time);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'User not found',
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while fetching user data',
      });
    }
  }
});

router.post('/', (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Name and email are required',
    });
  }

  const users = getAllUsers();
  const newId = Math.max(...users.map(u => u.id), 0) + 1;

  const user: User = {
    id: newId,
    name: String(name),
    email: String(email),
  };

  addUserToDatabase(user);
  cache.set(`user:${newId}`, user);

  res.status(201).json({
    ...user,
    message: 'User created successfully',
  });
});

export default router;

