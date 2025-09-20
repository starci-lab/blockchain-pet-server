import { Module } from '@nestjs/common'
import { FoodEmitters } from './index'

@Module({
  providers: [FoodEmitters],
  exports: [FoodEmitters]
})
export class FoodEmitterModule {}
