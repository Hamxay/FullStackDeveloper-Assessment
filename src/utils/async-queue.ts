import { QueueItem, User } from '../types';

export class AsyncQueue {
  private queue: QueueItem[];
  private processing: boolean;
  private pendingRequests: Map<number, Promise<User>>;

  constructor() {
    this.queue = [];
    this.processing = false;
    this.pendingRequests = new Map();
  }

  async enqueue(
    userId: number,
    processor: (userId: number) => Promise<User>
  ): Promise<User> {
    // If there's already a pending request for this user ID, return that promise
    if (this.pendingRequests.has(userId)) {
      return this.pendingRequests.get(userId)!;
    }

    // Create a new promise for this request
    const promise = new Promise<User>((resolve, reject) => {
      const item: QueueItem = {
        userId,
        resolve,
        reject,
      };
      this.queue.push(item);
    });

    // Store the promise for deduplication
    this.pendingRequests.set(userId, promise);

    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue(processor);
    }

    // Clean up the pending request after it completes
    promise
      .then(() => {
        this.pendingRequests.delete(userId);
      })
      .catch(() => {
        this.pendingRequests.delete(userId);
      });

    return promise;
  }

  private async processQueue(
    processor: (userId: number) => Promise<User>
  ): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await processor(item.userId);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;

    // If more items were added while processing, continue
    if (this.queue.length > 0) {
      this.processQueue(processor);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

