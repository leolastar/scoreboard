import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { ScoreProcessorsService } from './score-processors.service';

export interface ScoreSubmittedEvent {
  scoreId: number;
  userId: number;
  value: number;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private readonly channel = 'score-submitted';

  constructor(
    private configService: ConfigService,
    private scoreProcessorsService: ScoreProcessorsService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL', 'redis://localhost:6379');
    
    this.publisher = createClient({ url: redisUrl }) as RedisClientType;
    this.subscriber = createClient({ url: redisUrl }) as RedisClientType;

    await this.publisher.connect();
    await this.subscriber.connect();

    // Subscribe to score-submitted events
    await this.subscriber.subscribe(this.channel, (message) => {
      const event: ScoreSubmittedEvent = JSON.parse(message);
      this.scoreProcessorsService.processScoreSubmitted(event);
    });
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  async publishScoreSubmitted(event: ScoreSubmittedEvent): Promise<void> {
    await this.publisher.publish(this.channel, JSON.stringify(event));
  }
}

