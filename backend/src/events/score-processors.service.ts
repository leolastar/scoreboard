import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Score } from '../scores/entities/score.entity';
import { UserHighScore } from '../scores/entities/user-high-score.entity';
import { UserStats } from '../scores/entities/user-stats.entity';
import { ScoreSubmittedEvent } from './events.service';

@Injectable()
export class ScoreProcessorsService {
  constructor(
    @InjectRepository(Score)
    private scoresRepository: Repository<Score>,
    @InjectRepository(UserHighScore)
    private highScoresRepository: Repository<UserHighScore>,
    @InjectRepository(UserStats)
    private statsRepository: Repository<UserStats>,
    private dataSource: DataSource,
  ) {}

  async processScoreSubmitted(event: ScoreSubmittedEvent): Promise<void> {
    // Use database transaction with row-level locking for concurrency safety
    await this.dataSource.transaction(async (manager) => {
      const { userId, value } = event;

      // Process high score update with pessimistic locking
      const highScoreRepo = manager.getRepository(UserHighScore);
      const existingHighScore = await highScoreRepo.findOne({
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!existingHighScore) {
        await highScoreRepo.save({
          user_id: userId,
          value: value,
        });
      } else if (value > existingHighScore.value) {
        await highScoreRepo.update(
          { user_id: userId },
          { value: value },
        );
      }

      // Process stats update with pessimistic locking
      const statsRepo = manager.getRepository(UserStats);
      const existingStats = await statsRepo.findOne({
        where: { user_id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!existingStats) {
        await statsRepo.save({
          user_id: userId,
          total_scores: 1,
          average: value,
        });
      } else {
        // Update stats atomically
        const newTotal = existingStats.total_scores + 1;
        const currentSum = parseFloat(existingStats.average.toString()) * existingStats.total_scores;
        const newAverage = (currentSum + value) / newTotal;

        await statsRepo.update(
          { user_id: userId },
          {
            total_scores: newTotal,
            average: newAverage,
          },
        );
      }
    });
  }
}

