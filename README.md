# Event-Driven Scoring System

A full-stack TypeScript application demonstrating event-driven architecture with proper data integrity handling. Users can submit scores (0-100) through a React dashboard, which are processed asynchronously to update high score tables and statistics.

## Architecture

- **Backend**: NestJS with TypeORM and PostgreSQL
- **Event Processing**: Redis pub/sub for asynchronous score processing
- **Frontend**: React with TypeScript and Vite
- **Database**: PostgreSQL
- **Cache/Message Broker**: Redis

## Features

- ✅ User authentication with JWT
- ✅ Score submission with idempotency key support
- ✅ Event-driven asynchronous processing
- ✅ High score tracking per user
- ✅ Statistics tracking (total submissions, average)
- ✅ Concurrency-safe updates using database transactions and pessimistic locking
- ✅ Duplicate submission prevention via idempotency keys

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose

## Quick Start

### Option 1: Docker Compose (Recommended)

Start all services with a single command:

```bash
docker-compose up -d
```

This will start:
- `database` - PostgreSQL database
- `redis` - Redis message broker
- `backend` - NestJS API server
- `frontend` - React development server

Then seed the database with test users:
```bash
docker-compose exec backend npm run seed
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Option 2: Manual Setup

1. **Start infrastructure services**:
   ```bash
   docker-compose up -d database redis
   ```

2. **Set up backend**:
   ```bash
   cd backend
   npm install
   npm run seed  # Creates test users (user1@test.com and user2@test.com)
   npm run start:dev
   ```

3. **Set up frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Test Users

- Email: `user1@test.com`, Password: `password123`
- Email: `user2@test.com`, Password: `password123`

## API Endpoints

- `POST /auth/login` - Authenticate user
- `POST /scores` - Submit a score (requires authentication)
- `GET /me/high-score` - Get user's high score (requires authentication)
- `GET /me/stats` - Get user's statistics (requires authentication)

## Running Tests

```bash
cd backend
npm test              # Unit tests
npm run test:e2e      # Integration tests
```

## Environment Variables

Backend environment variables (optional, defaults provided):
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - PostgreSQL user (default: scoreboard)
- `DB_PASSWORD` - PostgreSQL password (default: scoreboard)
- `DB_NAME` - PostgreSQL database name (default: scoreboard)
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `JWT_SECRET` - JWT secret key (default: your-secret-key-change-in-production)

## Project Structure

```
scoreboard/
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── auth/     # Authentication module
│   │   ├── scores/   # Score submission and retrieval
│   │   ├── events/   # Event-driven processing
│   │   └── users/    # User management
│   └── test/         # E2E tests
├── frontend/         # React frontend
│   └── src/
│       ├── components/
│       ├── contexts/
│       └── services/
└── docker-compose.yml
```

## Database Schema

- `users` - User accounts
- `scores` - All score submissions (with idempotency_key)
- `user_high_scores` - Best score per user
- `user_stats` - Statistics per user (total_scores, average)

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).
