import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GameService } from './game/game.service';
import { createServer } from 'http';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { monitor } from '@colyseus/monitor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for client connections
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Get the game service after app initialization
  const gameService = app.get(GameService);
  const gameServer = gameService.getGameServer();

  // Create HTTP server
  const server = createServer(app.getHttpAdapter().getInstance());

  // Attach Colyseus to the HTTP server
  gameServer.attach({ server });

  // Add Colyseus Monitor after attaching the server
  app.use('/colyseus', monitor());

  // Wait for the app to be ready
  await app.init();

  const port = process.env.PORT || 3000;

  // Start the server
  server.listen(port, () => {
    console.log('🚀 NestJS + Colyseus Server started');
    console.log(`📡 Server running on: http://localhost:${port}`);
    console.log(`🎮 Game server ready for connections`);
    console.log(`🔗 WebSocket endpoint: ws://localhost:${port}`);
    console.log(`📊 Colyseus Monitor: http://localhost:${port}/colyseus`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
});
