import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { GameService } from './game/game.service';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly gameService: GameService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'NestJS + Colyseus',
    };
  }

  @Get('game/info')
  getGameInfo() {
    return this.gameService.getServerInfo();
  }

  @Get('test')
  getTestClient(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'test-client.html'));
  }
}
