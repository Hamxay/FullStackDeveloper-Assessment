interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorRate: number;
}

class MonitoringService {
  private metrics: PerformanceMetrics;
  private requestLogs: Array<{
    timestamp: number;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    cached: boolean;
  }>;

  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
    this.requestLogs = [];
  }

  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    cached: boolean
  ): void {
    this.metrics.totalRequests++;
    
    if (statusCode >= 200 && statusCode < 300) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Update average response time
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime;
    this.metrics.averageResponseTime = totalTime / this.metrics.totalRequests;

    // Update error rate
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100;

    // Log request (keep last 1000 logs)
    this.requestLogs.push({
      timestamp: Date.now(),
      method,
      path,
      statusCode,
      responseTime,
      cached,
    });

    if (this.requestLogs.length > 1000) {
      this.requestLogs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[${new Date().toISOString()}] ${method} ${path} - ${statusCode} - ${responseTime}ms - ${cached ? 'CACHED' : 'MISS'}`
      );
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getRecentLogs(limit: number = 100): typeof this.requestLogs {
    return this.requestLogs.slice(-limit);
  }

  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
    this.requestLogs = [];
  }
}

export const monitoringService = new MonitoringService();

