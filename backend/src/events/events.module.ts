import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { ScoreProcessorsService } from './score-processors.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from '../scores/entities/score.entity';
import { UserHighScore } from '../scores/entities/user-high-score.entity';
import { UserStats } from '../scores/entities/user-stats.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Score, UserHighScore, UserStats]),
  ],
  providers: [EventsService, ScoreProcessorsService],
  exports: [EventsService],
})
export class EventsModule {}

