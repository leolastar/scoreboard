import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('ScoresController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test user and login
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = userRepository.create({
      email: 'e2e-test@test.com',
      password: hashedPassword,
    });
    const savedUser = await userRepository.save(user);
    userId = savedUser.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'e2e-test@test.com',
        password: 'password123',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Cleanup test user
    const userRepository = dataSource.getRepository(User);
    await userRepository.delete({ email: 'e2e-test@test.com' });
    await app.close();
  });

  it('/scores (POST) should submit a score', async () => {
    const idempotencyKey = `test-${Date.now()}-${Math.random()}`;
    
    const response = await request(app.getHttpServer())
      .post('/scores')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        value: 85,
        idempotency_key: idempotencyKey,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.value).toBe(85);
    expect(response.body.message).toBe('Score submitted successfully');
  });

  it('/scores (POST) should handle duplicate idempotency key', async () => {
    const idempotencyKey = `test-duplicate-${Date.now()}`;
    
    // First submission
    await request(app.getHttpServer())
      .post('/scores')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        value: 90,
        idempotency_key: idempotencyKey,
      })
      .expect(201);

    // Duplicate submission
    const response = await request(app.getHttpServer())
      .post('/scores')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        value: 95, // Different value, but same key
        idempotency_key: idempotencyKey,
      })
      .expect(201);

    expect(response.body.message).toBe('Score already submitted');
    expect(response.body.value).toBe(90); // Original value
  });

  it('/me/high-score (GET) should return high score', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/high-score')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('user_id');
    expect(response.body).toHaveProperty('value');
  });

  it('/me/stats (GET) should return stats', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/stats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('user_id');
    expect(response.body).toHaveProperty('total_scores');
    expect(response.body).toHaveProperty('average');
  });
});

