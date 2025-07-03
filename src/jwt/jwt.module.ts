import { DynamicModule, Module } from '@nestjs/common'
import { ConfigurableModuleClass, OPTIONS_TYPE } from './jwt.module-definition'
import { JwtService } from 'src/jwt/jwt.service'
import { JwtStrategy } from 'src/jwt/strategies/jwt.strategy'
import { JwtService as NestJwtService } from '@nestjs/jwt'
import { JwtModule as NestJwtModule } from '@nestjs/jwt'

@Module({})
export class JwtModule extends ConfigurableModuleClass {
  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    const dynamicModule = super.register(options)

    return {
      ...dynamicModule,
      imports: [
        NestJwtModule.register({
          global: true
        })
      ],
      providers: [...(dynamicModule.providers ?? []), JwtStrategy, JwtService, NestJwtService],
      exports: [JwtService]
    }
  }
}
