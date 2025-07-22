import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './api/auth/auth.module';
import { UserModule } from './api/user/user.module';
import authConfig from 'src/api/auth/config/auth-config';
import { StoreItemModule } from './api/store-item/store-item.module';
import { PetModule } from './api/pet/pet.module';
import { BullModule } from '@nestjs/bullmq';
import { getPetQueueConfig } from './game/bull/config/queue.config';
import { QUEUE_NAME } from './game/bull/constants/queue.constant';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [authConfig],
      cache: true,
      expandVariables: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_NAME.UPDATE_PET_STATS,
      ...getPetQueueConfig(),
    }),
    GameModule,
    AuthModule,
    UserModule,
    StoreItemModule,
    PetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
