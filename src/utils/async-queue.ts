import { QueueItem, User } from '../types';

export class AsyncQueue {
  private queue: QueueItem[];
  private processing: boolean;

  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async enqueue(
    userId: number,
    processor: (userId: number) => Promise<User>
  ): Promise<User> {
    return new Promise<User>((resolve, reject) => {
      this.queue.push({ userId, resolve, reject });
      if (!this.processing) {
        this.processQueue(processor);
      }
    });
  }

  private async processQueue(
    processor: (userId: number) => Promise<User>
  ): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const result = await processor(item.userId);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

