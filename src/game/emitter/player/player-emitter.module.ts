import { Module } from '@nestjs/common'
import { PlayerEmitter } from './index'

@Module({
  providers: [PlayerEmitter],
  exports: [PlayerEmitter]
})
export class PlayerEmitterModule {}
