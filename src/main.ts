import { NestFactory } from '@nestjs/core'
import { createServer } from 'http'
import { AppModule } from './app.module'
import { GameService } from './game/game.service'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  // Create NestJS app
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Enable CORS for client connections
  app.enableCors({
    origin: '*', // Cho phép mọi domain gọi
    credentials: false // Phải tắt nếu dùng '*'
  })

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'))

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Nest Colyseus API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      displayOperationId: true,
      displayRequestDuration: true,
      filter: true
    }
  })

  // Start NestJS server trên port riêng
  const NEST_PORT = parseInt(process.env.NEST_PORT || '3001')
  await app.listen(NEST_PORT)
  console.log('🚀 NestJS API Server started')
  console.log(`📡 API running on: http://localhost:${NEST_PORT}`)
  console.log(`📚 Swagger UI: http://localhost:${NEST_PORT}/docs`)

  // Tạo HTTP server riêng cho Colyseus
  const httpServer = createServer()
  const gameService = app.get(GameService)
  gameService.createServer(httpServer)

  // Start Colyseus server trên port riêng
  const COLYSEUS_PORT = parseInt(process.env.COLYSEUS_PORT || '3002')
  httpServer.listen(COLYSEUS_PORT, () => {
    console.log('🎮 Colyseus Game Server started')
    console.log(`🔗 WebSocket endpoint: ws://localhost:${COLYSEUS_PORT}`)
    console.log(`📊 Colyseus Monitor: http://localhost:${COLYSEUS_PORT}/colyseus`)
  })
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err)
})
