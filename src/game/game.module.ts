import { Module } from '@nestjs/common';
import { GameService } from 'src/game/game.service';

@Module({
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
