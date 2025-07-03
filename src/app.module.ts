import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './api/auth/auth.module';
import { UserModule } from './api/user/user.module';
import authConfig from 'src/api/auth/config/auth-config';
import { JwtModule } from 'src/jwt/jwt.module';

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
    GameModule,
    AuthModule,
    UserModule,
    JwtModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        accessSecret:
          configService.get<string>('AUTH_ACCESS_SECRET') || 'default-secret',
        accessExpiresIn:
          configService.get<string>('AUTH_ACCESS_TOKEN_EXPIRES_IN') || '1d',
        refreshSecret:
          configService.get<string>('AUTH_REFRESH_SECRET') ||
          'default-refresh-secret',
        refreshExpiresIn:
          configService.get<string>('AUTH_REFRESH_TOKEN_EXPIRES_IN') || '365d',
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
