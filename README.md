# User Data API

Express.js API for managing user data with caching and rate limiting.

## Setup

```bash
npm install
npm run build
npm start
```

Server runs on port 3000 by default.

## Endpoints

- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `GET /cache-status` - Get cache stats
- `DELETE /cache` - Clear cache
- `GET /monitoring/metrics` - Get metrics
- `GET /monitoring/logs` - Get request logs
- `GET /health` - Health check

## Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode

