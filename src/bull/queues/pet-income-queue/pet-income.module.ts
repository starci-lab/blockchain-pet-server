import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { queuesConfig } from '../../config/queue.config'
import { PetModule } from 'src/api/pet/pet.module'
import { PetIncomeQueueEvents } from './pet-income.event'
import { PetIncomeService } from './pet-income.service'
import { PetIncomeProcessor } from './pet-imcome.processor'

@Module({
  imports: [BullModule.registerQueue(...queuesConfig), PetModule],
  providers: [PetIncomeService, PetIncomeProcessor, PetIncomeQueueEvents]
})
export class PetIncomeQueueModule {}
