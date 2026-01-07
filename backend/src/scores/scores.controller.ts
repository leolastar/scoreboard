import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('scores')
export class ScoresController {
  constructor(private scoresService: ScoresService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async submitScore(@Request() req, @Body() submitScoreDto: SubmitScoreDto) {
    const userId = req.user.id;
    return this.scoresService.submitScore(userId, submitScoreDto);
  }
}

