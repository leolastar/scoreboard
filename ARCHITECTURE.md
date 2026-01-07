# Architecture Documentation

## System Overview

The Event-Driven Scoring System is designed to handle score submissions with strong data integrity guarantees. The architecture separates immediate persistence from asynchronous processing, ensuring both responsiveness and correctness.

## Event Flow

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ POST /scores
       │ { value, idempotency_key }
       ▼
┌─────────────────────────────────┐
│      NestJS Backend             │
│  ┌───────────────────────────┐  │
│  │  ScoresController         │  │
│  │  - Validates request      │  │
│  │  - Checks idempotency     │  │
│  └───────────┬───────────────┘  │
│              │                   │
│  ┌───────────▼───────────────┐  │
│  │  ScoresService            │  │
│  │  - Persists to scores     │  │
│  │  - Publishes event        │  │
│  └───────────┬───────────────┘  │
└──────────────┼──────────────────┘
               │
               │ Redis PUBLISH
               ▼
        ┌──────────────┐
        │    Redis     │
        │  (Channel:   │
        │score-submitted)│
        └──────┬───────┘
               │
               │ Redis SUBSCRIBE
               ▼
┌─────────────────────────────────┐
│  ScoreProcessorsService          │
│  ┌───────────────────────────┐  │
│  │  processScoreSubmitted()  │  │
│  │  - Transaction starts      │  │
│  │  - Lock user_high_scores   │  │
│  │  - Update if higher        │  │
│  │  - Lock user_stats         │  │
│  │  - Recalculate average     │  │
│  │  - Transaction commits     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Idempotency Strategy

### Problem
Duplicate submissions (e.g., network retries, user double-clicks) must not result in:
- Multiple score records for the same submission
- Double-counting in statistics
- Incorrect high score updates

### Solution

1. **Idempotency Key**: Each score submission includes a unique `idempotency_key` generated client-side.
2. **Database Constraint**: The `scores` table has a unique constraint on `idempotency_key`.
3. **Application-Level Check**: Before creating a new score, the service checks for an existing score with the same key.
4. **Idempotent Response**: If a duplicate key is found, the original score is returned without creating a new record or publishing an event.

### Implementation

```typescript
// In ScoresService.submitScore()
const existingScore = await this.scoresRepository.findOne({
  where: { idempotency_key: submitScoreDto.idempotency_key },
});

if (existingScore) {
  return {
    id: existingScore.id,
    value: existingScore.value,
    message: 'Score already submitted',
  };
}
```

### Key Generation
The frontend generates idempotency keys using:
```typescript
`${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

This ensures uniqueness across:
- Different users
- Different timestamps
- Random component for concurrent submissions

## Concurrency Handling

### Problem
When multiple score submissions for the same user are processed concurrently, we must prevent:
- Race conditions in high score updates
- Incorrect statistics calculations
- Lost updates

### Solution: Pessimistic Locking with Transactions

The `ScoreProcessorsService` uses PostgreSQL's pessimistic locking within a transaction:

1. **Transaction Boundary**: All updates happen in a single database transaction.
2. **Pessimistic Write Lock**: When reading `user_high_scores` or `user_stats`, we acquire a `pessimistic_write` lock.
3. **Atomic Updates**: All reads and writes happen within the locked context, ensuring no other process can modify the same records concurrently.

### Implementation

```typescript
await this.dataSource.transaction(async (manager) => {
  // High score update with lock
  const existingHighScore = await highScoreRepo.findOne({
    where: { user_id: userId },
    lock: { mode: 'pessimistic_write' },
  });
  
  // Update logic...
  
  // Stats update with lock
  const existingStats = await statsRepo.findOne({
    where: { user_id: userId },
    lock: { mode: 'pessimistic_write' },
  });
  
  // Update logic...
});
```

### Why Pessimistic Locking?

- **Correctness**: Ensures serializable execution of concurrent updates
- **Simplicity**: Easier to reason about than optimistic locking with retries
- **Performance**: Acceptable for this use case where contention is moderate

### Alternative Considered: Optimistic Locking

Optimistic locking with version columns was considered but rejected because:
- Requires retry logic for conflicts
- More complex error handling
- Higher risk of transaction rollbacks under load

## Key Design Decisions

### 1. Event-Driven Architecture

**Decision**: Use Redis pub/sub for asynchronous processing instead of synchronous updates.

**Rationale**:
- **Responsiveness**: API responds immediately after persisting the score
- **Scalability**: Event consumers can be scaled independently
- **Resilience**: Failed processing doesn't block score submission
- **Separation of Concerns**: Write path (submission) separated from read path (aggregates)

**Trade-offs**:
- Eventual consistency: Stats may lag slightly behind submissions
- Complexity: Requires event handling infrastructure

### 2. Separate Aggregation Tables

**Decision**: Maintain `user_high_scores` and `user_stats` as separate tables instead of calculating on-the-fly.

**Rationale**:
- **Performance**: Fast reads without scanning all scores
- **Scalability**: O(1) reads regardless of submission count
- **Consistency**: Single source of truth for aggregates

**Trade-offs**:
- Storage: Additional tables require maintenance
- Consistency: Must keep aggregates in sync (handled by event processing)

### 3. Database Synchronization

**Decision**: Use TypeORM's `synchronize: true` in development (disabled in production).

**Rationale**:
- **Developer Experience**: No manual migration management for this exercise
- **Rapid Iteration**: Schema changes apply automatically

**Production Note**: In production, use proper migrations (e.g., TypeORM migrations or Flyway).

### 4. JWT Authentication

**Decision**: Use JWT tokens for stateless authentication.

**Rationale**:
- **Scalability**: No server-side session storage
- **Simplicity**: Standard approach for REST APIs
- **Security**: Tokens expire after 24 hours

## Data Flow Details

### Score Submission Flow

1. **Client Request**: POST `/scores` with `{ value, idempotency_key }`
2. **Authentication**: JWT token validated via `JwtAuthGuard`
3. **Idempotency Check**: Query `scores` table for existing `idempotency_key`
4. **Persistence**: If new, insert into `scores` table
5. **Event Publishing**: Publish `ScoreSubmittedEvent` to Redis channel
6. **Response**: Return score ID and confirmation

### Event Processing Flow

1. **Event Subscription**: `EventsService` subscribes to `score-submitted` channel
2. **Event Reception**: `ScoreProcessorsService.processScoreSubmitted()` called
3. **Transaction Start**: Begin database transaction
4. **High Score Update**:
   - Lock `user_high_scores` row for user
   - Read current high score
   - Update if new score is higher
5. **Stats Update**:
   - Lock `user_stats` row for user
   - Read current stats
   - Increment `total_scores`
   - Recalculate `average = (currentSum + newValue) / newTotal`
6. **Transaction Commit**: All changes committed atomically

## Error Handling

### Idempotency Violations
- Handled at application level (check before insert)
- Database unique constraint as backup
- Returns existing score on duplicate

### Event Processing Failures
- Currently: Errors logged, event lost
- Production: Implement dead-letter queue or retry mechanism

### Database Transaction Failures
- Transaction rollback ensures no partial updates
- Event may need reprocessing (consider idempotent event handlers)

## Testing Strategy

### Unit Tests
- `ScoresService`: Tests idempotency handling, event publishing
- Mocks: Repository, EventsService

### Integration Tests
- E2E tests: Full request/response cycle
- Database: Uses test database with cleanup
- Authentication: Creates test users, obtains tokens

## Future Improvements

1. **Event Processing Resilience**:
   - Dead-letter queue for failed events
   - Retry mechanism with exponential backoff
   - Event idempotency (deduplicate events)

2. **Real-time Updates**:
   - WebSocket connection for live stats updates
   - Server-Sent Events (SSE) alternative

3. **Performance**:
   - Redis caching for frequently accessed stats
   - Batch event processing
   - Database connection pooling optimization

4. **Monitoring**:
   - Event processing metrics
   - Database lock contention monitoring
   - API response time tracking

5. **Migrations**:
   - TypeORM migrations for production
   - Schema versioning strategy

