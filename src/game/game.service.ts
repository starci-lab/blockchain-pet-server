import {
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Server, Room } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/game.room';
import {
  getRedisConfig,
  createRedisPresence,
  createRedisDriver,
} from './config/redis.config';
import * as http from 'http';

@Injectable()
export class GameService implements OnModuleInit, OnApplicationShutdown {
  private gameServer: Server;

  constructor() {
    console.log('🎮 Creating Game Service...');
    // Server sẽ được tạo sau khi có HTTP server từ main.ts
  }

  // Tạo server với HTTP server được chia sẻ từ NestJS
  createServer(httpServer?: http.Server) {
    if (this.gameServer) {
      console.log('⚠️  Game server already exists');
      return this.gameServer;
    }

    console.log('🔧 Setting up Colyseus server...');

    // Check if Redis is enabled
    console.log('ENABLE_REDIS:', process.env.ENABLE_REDIS);
    const enableRedis = process.env.ENABLE_REDIS === 'true';
    const pingInterval = parseInt(process.env.COLYSEUS_PING_INTERVAL || '6000');
    const pingMaxRetries = parseInt(
      process.env.COLYSEUS_PING_MAX_RETRIES || '3',
    );

    const serverOptions: any = {
      transport: new WebSocketTransport({
        server: httpServer, // Sử dụng HTTP server từ NestJS
        pingInterval,
        pingMaxRetries,
      }),
    };

    // Add Redis configuration if enabled
    if (enableRedis) {
      try {
        const redisConfig = getRedisConfig();
        console.log('🔄 Setting up Redis connection...');
        console.log(`📍 Redis config: ${redisConfig.host}:${redisConfig.port}`);

        serverOptions.presence = createRedisPresence(redisConfig);
        serverOptions.driver = createRedisDriver(redisConfig);

        console.log('✅ Redis presence and driver configured');
        console.log('🎯 Colyseus will use Redis for presence & driver');
      } catch (error) {
        console.error('❌ Redis setup failed:', error.message);
        console.log('⚠️  Falling back to in-memory storage');
      }
    } else {
      console.log('📝 Using in-memory storage (Redis disabled)');
    }

    // Create Colyseus server
    this.gameServer = new Server(serverOptions);

    // Define default game room
    this.gameServer.define('game', GameRoom);

    console.log('✅ Game Service created with server');
    return this.gameServer;
  }

  // Định nghĩa room với tên và type
  defineRoom(name: string, room: any) {
    if (!this.gameServer) {
      throw new Error(
        'Game server not initialized. Call createServer() first.',
      );
    }
    this.gameServer.define(name, room);
    console.log(`🎯 Room "${name}" defined successfully`);
  }

  onModuleInit() {
    console.log('🚀 Game Service module initialized');
  }

  onApplicationShutdown(signal?: string) {
    console.log(`🛑 Shutting down Game Service... Signal: ${signal}`);
    if (this.gameServer) {
      this.gameServer.gracefullyShutdown();
      console.log('✅ Game server shutdown complete');
    }
  }

  getGameServer(): Server {
    if (!this.gameServer) {
      throw new Error('Game server not initialized');
    }
    return this.gameServer;
  }

  // Get basic server info
  getServerInfo() {
    return {
      status: 'running',
      timestamp: Date.now(),
    };
  }
}
