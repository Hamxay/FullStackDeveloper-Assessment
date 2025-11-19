# User Data API

A highly efficient Express.js API built with TypeScript that serves user data with advanced caching strategies, rate limiting, and asynchronous processing to handle high traffic and improve performance.

## Features

- ✅ **Advanced In-Memory LRU Cache** with 60-second TTL
- ✅ **Cache Statistics** tracking (hits, misses, size, average response time)
- ✅ **Automatic Stale Cache Cleanup** via background tasks
- ✅ **Request Deduplication** for concurrent requests to the same user ID
- ✅ **Sophisticated Rate Limiting** (10 req/min, burst 5 req/10s)
- ✅ **Asynchronous Processing Queue** for database operations
- ✅ **Performance Monitoring** with metrics and request logging
- ✅ **TypeScript** for type safety and better maintainability

## Project Structure

```
user-data-api/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── lru-cache.ts         # LRU cache implementation
│   │   ├── rate-limiter.ts     # Rate limiting logic
│   │   ├── async-queue.ts      # Asynchronous processing queue
│   │   ├── mock-database.ts    # Mock database with user data
│   │   └── monitoring.ts       # Performance monitoring service
│   ├── middleware/
│   │   ├── rate-limit-middleware.ts    # Rate limiting middleware
│   │   └── response-time-middleware.ts # Response time tracking
│   └── routes/
│       ├── users.ts             # User endpoints
│       ├── cache.ts             # Cache management endpoints
│       └── monitoring.ts        # Monitoring endpoints
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd user-data-api
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` by default. You can change the port by setting the `PORT` environment variable.

## API Endpoints

### User Endpoints

#### GET /users/:id
Retrieve user data by ID with caching.

**Parameters:**
- `id` (path parameter): User ID (number)

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "_cached": true,
  "_responseTime": 2
}
```

**Status Codes:**
- `200`: User found (cached or fetched)
- `400`: Invalid user ID
- `404`: User not found
- `429`: Rate limit exceeded

**Example:**
```bash
curl http://localhost:3000/users/1
```

#### POST /users
Create a new user.

**Request Body:**
```json
{
  "name": "Bob Wilson",
  "email": "bob@example.com"
}
```

**Response:**
```json
{
  "id": 4,
  "name": "Bob Wilson",
  "email": "bob@example.com",
  "message": "User created successfully"
}
```

**Status Codes:**
- `201`: User created successfully
- `400`: Validation error (missing name or email)
- `429`: Rate limit exceeded

**Example:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob Wilson","email":"bob@example.com"}'
```

### Cache Management Endpoints

#### GET /cache-status
Get cache statistics.

**Response:**
```json
{
  "hits": 150,
  "misses": 25,
  "size": 3,
  "averageResponseTime": 15.5
}
```

**Example:**
```bash
curl http://localhost:3000/cache-status
```

#### DELETE /cache
Clear the entire cache.

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/cache
```

### Monitoring Endpoints

#### GET /monitoring/metrics
Get performance metrics.

**Response:**
```json
{
  "totalRequests": 200,
  "successfulRequests": 195,
  "failedRequests": 5,
  "cacheHits": 150,
  "cacheMisses": 50,
  "averageResponseTime": 18.3,
  "errorRate": 2.5
}
```

**Example:**
```bash
curl http://localhost:3000/monitoring/metrics
```

#### GET /monitoring/logs
Get recent request logs.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 100)

**Response:**
```json
{
  "logs": [
    {
      "timestamp": 1700000000000,
      "method": "GET",
      "path": "/users/1",
      "statusCode": 200,
      "responseTime": 2,
      "cached": true
    }
  ],
  "count": 1
}
```

**Example:**
```bash
curl http://localhost:3000/monitoring/logs?limit=50
```

### Health Check

#### GET /health
Check server health.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Implementation Details

### Caching Strategy

The API implements a **Least Recently Used (LRU) cache** with the following features:

1. **TTL (Time To Live)**: Cache entries expire after 60 seconds
2. **Automatic Cleanup**: Background task runs every 30 seconds to remove stale entries
3. **LRU Eviction**: When the cache is full, least recently used items are evicted first
4. **Statistics Tracking**: Tracks cache hits, misses, size, and average response time
5. **Request Deduplication**: Concurrent requests for the same user ID share a single database fetch operation

**Cache Flow:**
1. Request arrives for user ID
2. Check cache - if found and not expired, return immediately
3. If not in cache, check if there's a pending request for this ID
4. If pending request exists, wait for it to complete
5. If no pending request, add to async queue and fetch from database
6. Cache the result and return to all waiting requests

### Rate Limiting

The API implements a sophisticated rate limiting strategy:

- **Per-Minute Limit**: 10 requests per minute per IP address
- **Burst Capacity**: 5 requests in a 10-second window
- **Sliding Window**: Uses a sliding window algorithm to track requests
- **Automatic Cleanup**: Old request records are cleaned up automatically

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in the current window

**Rate Limit Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

### Asynchronous Processing

The API uses an **asynchronous queue** to handle database operations:

1. **Request Deduplication**: Multiple concurrent requests for the same user ID share a single database fetch
2. **Non-Blocking**: Database operations don't block the event loop
3. **Queue Management**: Requests are processed sequentially from the queue
4. **Error Handling**: Failed requests are properly handled and don't affect other requests

### Performance Optimizations

1. **Concurrent Request Handling**: Uses Promise-based deduplication to prevent duplicate database calls
2. **Cache-First Strategy**: Always checks cache before database
3. **Efficient Data Structures**: Uses Map for O(1) cache lookups
4. **Background Cleanup**: Stale cache entries are cleaned in the background
5. **Response Time Tracking**: Monitors and logs response times for performance analysis

## Testing with Postman

### Testing Cache Performance

1. **First Request** (Cache Miss):
   - Send `GET /users/1`
   - Expected response time: ~200ms (database simulation delay)
   - Response includes `"_cached": false`

2. **Subsequent Requests** (Cache Hit):
   - Send `GET /users/1` again immediately
   - Expected response time: <5ms (from cache)
   - Response includes `"_cached": true`

3. **Cache Expiration**:
   - Wait 60+ seconds
   - Send `GET /users/1`
   - Expected response time: ~200ms (cache expired, fetched from database)

### Testing Rate Limiting

1. **Normal Traffic**:
   - Send 5 requests quickly (within 10 seconds)
   - All should succeed (burst capacity)

2. **Rate Limit Exceeded**:
   - Send 11 requests within 1 minute
   - The 11th request should return `429` status

3. **Rate Limit Reset**:
   - Wait for the rate limit window to reset
   - Requests should succeed again

### Testing Concurrent Requests

1. **Request Deduplication**:
   - Send 10 simultaneous requests for the same user ID
   - Only 1 database call should be made
   - All 10 requests should receive the same response
   - Response times should be similar (all waiting for the same database call)

2. **Different User IDs**:
   - Send simultaneous requests for different user IDs (e.g., /users/1, /users/2, /users/3)
   - Each should trigger a separate database call
   - All should complete successfully

### Testing Cache Management

1. **Cache Status**:
   - Send `GET /cache-status` to view current cache statistics
   - Make several requests to populate cache
   - Check cache size and hit/miss ratios

2. **Clear Cache**:
   - Send `DELETE /cache` to clear all cached data
   - Verify cache size is 0 via `GET /cache-status`
   - Subsequent requests should fetch from database

### Testing User Creation

1. **Create User**:
   - Send `POST /users` with name and email
   - Verify user is created and returned
   - Verify user is automatically cached

2. **Fetch Created User**:
   - Send `GET /users/{newId}` with the ID from creation
   - Should return from cache immediately

### Testing Monitoring

1. **View Metrics**:
   - Send `GET /monitoring/metrics` to view overall performance
   - Make various requests
   - Check updated metrics

2. **View Logs**:
   - Send `GET /monitoring/logs` to view recent request logs
   - Use `limit` parameter to control number of logs returned

## Performance Metrics

The API tracks the following metrics:

- **Total Requests**: Total number of requests processed
- **Successful Requests**: Requests that returned 2xx status codes
- **Failed Requests**: Requests that returned 4xx or 5xx status codes
- **Cache Hits**: Number of requests served from cache
- **Cache Misses**: Number of requests that required database fetch
- **Average Response Time**: Average response time across all requests
- **Error Rate**: Percentage of failed requests

## Error Handling

The API provides meaningful error messages for various scenarios:

- **400 Bad Request**: Invalid input (e.g., non-numeric user ID, missing required fields)
- **404 Not Found**: User ID doesn't exist in the database
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server errors

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## Future Enhancements

Potential improvements for production use:

1. **Redis Integration**: Replace in-memory cache with Redis for distributed caching
2. **Database Integration**: Replace mock database with real database (PostgreSQL, MongoDB, etc.)
3. **Authentication**: Add JWT-based authentication
4. **Pagination**: Add pagination for user listing endpoints
5. **Prometheus Integration**: Export metrics to Prometheus for advanced monitoring
6. **Docker Support**: Add Dockerfile and docker-compose.yml
7. **Unit Tests**: Add comprehensive test suite
8. **API Documentation**: Add Swagger/OpenAPI documentation

## License

ISC

## Author

Created as part of an expert-level Express.js assignment demonstrating advanced caching, rate limiting, and asynchronous processing techniques.

