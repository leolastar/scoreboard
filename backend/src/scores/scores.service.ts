import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './entities/score.entity';
import { UserHighScore } from './entities/user-high-score.entity';
import { UserStats } from './entities/user-stats.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private scoresRepository: Repository<Score>,
    @InjectRepository(UserHighScore)
    private highScoresRepository: Repository<UserHighScore>,
    @InjectRepository(UserStats)
    private statsRepository: Repository<UserStats>,
    private eventsService: EventsService,
  ) {}

  async submitScore(userId: number, submitScoreDto: SubmitScoreDto) {
    // Check for duplicate idempotency key
    const existingScore = await this.scoresRepository.findOne({
      where: { idempotency_key: submitScoreDto.idempotency_key },
    });

    if (existingScore) {
      // Return existing score (idempotent behavior)
      return {
        id: existingScore.id,
        value: existingScore.value,
        message: 'Score already submitted',
      };
    }

    // Create new score
    const score = this.scoresRepository.create({
      user_id: userId,
      value: submitScoreDto.value,
      idempotency_key: submitScoreDto.idempotency_key,
    });

    const savedScore = await this.scoresRepository.save(score);

    // Publish event for async processing
    await this.eventsService.publishScoreSubmitted({
      scoreId: savedScore.id,
      userId,
      value: submitScoreDto.value,
    });

    return {
      id: savedScore.id,
      value: savedScore.value,
      message: 'Score submitted successfully',
    };
  }

  async getHighScore(userId: number) {
    const highScore = await this.highScoresRepository.findOne({
      where: { user_id: userId },
    });

    return {
      user_id: userId,
      value: highScore?.value ?? 0,
      updated_at: highScore?.updated_at ?? null,
    };
  }

  async getStats(userId: number) {
    const stats = await this.statsRepository.findOne({
      where: { user_id: userId },
    });

    return {
      user_id: userId,
      total_scores: stats?.total_scores ?? 0,
      average: stats?.average ? parseFloat(stats.average.toString()) : 0,
      updated_at: stats?.updated_at ?? null,
    };
  }
}

