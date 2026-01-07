import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('me')
export class MeController {
  constructor(private scoresService: ScoresService) {}

  @UseGuards(JwtAuthGuard)
  @Get('high-score')
  async getHighScore(@Request() req) {
    const userId = req.user.id;
    return this.scoresService.getHighScore(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req) {
    const userId = req.user.id;
    return this.scoresService.getStats(userId);
  }
}

