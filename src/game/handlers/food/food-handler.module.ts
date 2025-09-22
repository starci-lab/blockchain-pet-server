import { Module } from '@nestjs/common'
import { FoodService } from './food.service'

@Module({
  providers: [FoodService],
  exports: [FoodService]
})
export class FoodHandlerModule {}
