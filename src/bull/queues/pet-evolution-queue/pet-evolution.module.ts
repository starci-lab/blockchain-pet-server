import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { queuesConfig } from '../../config/queue.config'
import { PetModule } from 'src/api/pet/pet.module'
import { PetEvulationService } from './pet-evolution.service'
import { PetEvolutionProcessor } from './pet-evolution.processor'
import { PetEvolutionQueueEvents } from './pet-evolution.event'

@Module({
  imports: [BullModule.registerQueue(...queuesConfig), PetModule],
  providers: [PetEvulationService, PetEvolutionProcessor, PetEvolutionQueueEvents]
})
export class PetEvolutionQueueModule {}
