import { CacheEntry, CacheStats } from '../types';

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxAge: number;
  private stats: CacheStats;
  private responseTimes: number[];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxAge: number = 60000) {
    this.cache = new Map();
    this.maxAge = maxAge;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      averageResponseTime: 0,
    };
    this.responseTimes = [];
    this.startCleanupTask();
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      return null;
    }

    entry.accessTime = now;
    this.stats.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: string, value: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      accessTime: now,
    };

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.responseTimes = [];
    this.updateAverageResponseTime();
  }

  getStats(): CacheStats {
    this.updateAverageResponseTime();
    return { ...this.stats };
  }

  recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    this.updateAverageResponseTime();
  }

  private updateAverageResponseTime(): void {
    if (this.responseTimes.length === 0) {
      this.stats.averageResponseTime = 0;
      return;
    }
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    this.stats.averageResponseTime = sum / this.responseTimes.length;
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, 30000);
  }

  private cleanupStaleEntries(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    this.stats.size = this.cache.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

