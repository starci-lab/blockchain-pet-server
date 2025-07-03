import { Injectable, OnModuleInit } from '@nestjs/common';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/game.room';
import {
  getRedisConfig,
  createRedisPresence,
  createRedisDriver,
} from './config/redis.config';

@Injectable()
export class GameService implements OnModuleInit {
  private gameServer: Server;

  constructor() {
    console.log('🎮 Creating Game Service...');

    // Check if Redis is enabled
    console.log(process.env.ENABLE_REDIS);
    const enableRedis = process.env.ENABLE_REDIS === 'true';
    const pingInterval = parseInt(process.env.COLYSEUS_PING_INTERVAL || '6000');
    const pingMaxRetries = parseInt(
      process.env.COLYSEUS_PING_MAX_RETRIES || '3',
    );

    const serverOptions: any = {
      transport: new WebSocketTransport({
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

    // Define game room
    this.gameServer.define('game', GameRoom);

    console.log('✅ Game Service created with server');
  }

  onModuleInit() {
    console.log('🚀 Game Service module initialized');
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
