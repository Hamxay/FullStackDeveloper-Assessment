import { Router, Request, Response } from 'express';
import { LRUCache } from '../utils/lru-cache';
import { AsyncQueue } from '../utils/async-queue';
import { fetchUserFromDatabase, addUserToDatabase, getAllUsers } from '../utils/mock-database';
import { User } from '../types';

const router = Router();
const cache = new LRUCache<User>(60000); // 60 seconds TTL
const asyncQueue = new AsyncQueue();

// Store cache instance for middleware
let cacheInstance: LRUCache<User> | null = null;

export function getCacheInstance(): LRUCache<User> {
  if (!cacheInstance) {
    cacheInstance = cache;
  }
  return cacheInstance;
}

/**
 * GET /users/:id
 * Retrieve user data by ID with caching
 */
router.get('/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userId = parseInt(req.params.id, 10);

  if (isNaN(userId)) {
    res.status(400).json({
      error: 'Invalid user ID',
      message: 'User ID must be a valid number',
    });
    return;
  }

  // Check cache first
  const cacheKey = `user:${userId}`;
  const cachedUser = cache.get(cacheKey);

  if (cachedUser) {
    const responseTime = Date.now() - startTime;
    cache.recordResponseTime(responseTime);
    req._cached = true; // Mark request as cached for monitoring
    res.json({
      ...cachedUser,
      _cached: true,
      _responseTime: responseTime,
    });
    return;
  }

  // If not in cache, use async queue to fetch from database
  try {
    const user = await asyncQueue.enqueue(userId, fetchUserFromDatabase);
    
    // Only cache if not already cached (to avoid race conditions)
    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, user);
    }

    const responseTime = Date.now() - startTime;
    cache.recordResponseTime(responseTime);
    req._cached = false; // Mark request as not cached for monitoring
    res.json({
      ...user,
      _cached: false,
      _responseTime: responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    cache.recordResponseTime(responseTime);
    
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

/**
 * POST /users
 * Create a new user
 */
router.post('/', (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    res.status(400).json({
      error: 'Validation error',
      message: 'Name and email are required',
    });
    return;
  }

  // Generate new ID (simple increment, in production use proper ID generation)
  const existingUsers = getAllUsers();
  const newId = Math.max(...existingUsers.map(u => u.id), 0) + 1;

  const newUser: User = {
    id: newId,
    name: String(name),
    email: String(email),
  };

  addUserToDatabase(newUser);

  // Cache the new user
  const cacheKey = `user:${newId}`;
  cache.set(cacheKey, newUser);

  res.status(201).json({
    ...newUser,
    message: 'User created successfully',
  });
});

export default router;

