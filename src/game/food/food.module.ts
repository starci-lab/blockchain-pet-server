import { Module } from '@nestjs/common'
import { FoodService } from './food.service'
import { FoodEmitters } from './food.emitters'

@Module({
  providers: [FoodService, FoodEmitters],
  exports: [FoodService, FoodEmitters]
})
export class FoodModule {}
