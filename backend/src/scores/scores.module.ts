import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScoresController } from './scores.controller';
import { MeController } from './me.controller';
import { ScoresService } from './scores.service';
import { Score } from './entities/score.entity';
import { UserHighScore } from './entities/user-high-score.entity';
import { UserStats } from './entities/user-stats.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Score, UserHighScore, UserStats]),
    EventsModule,
  ],
  controllers: [ScoresController, MeController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}

