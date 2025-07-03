import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export function getRedisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  };
}

export function createRedisPresence(config: RedisConfig) {
  return new RedisPresence({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
  });
}

export function createRedisDriver(config: RedisConfig) {
  return new RedisDriver({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
  });
}
