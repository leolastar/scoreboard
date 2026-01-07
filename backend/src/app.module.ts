import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ScoresModule } from './scores/scores.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { DatabaseConfig } from './config/database.config';
import { StartupSeedService } from './scripts/startup-seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    AuthModule,
    UsersModule,
    ScoresModule,
    EventsModule,
  ],
  providers: [StartupSeedService],
})
export class AppModule {}

