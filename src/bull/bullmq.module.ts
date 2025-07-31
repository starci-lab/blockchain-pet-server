import { Module } from '@nestjs/common'
import { PetQueueModule } from './queues/pet-queue/pet-queue.module'
import { PetModule } from 'src/api/pet/pet.module'
import { PetEvolutionQueueModule } from './queues/pet-evolution-queue/pet-evolution.module'

@Module({
  imports: [PetQueueModule, PetModule, PetEvolutionQueueModule],
  providers: [],
  exports: []
})
export class BullModuleMQ {}
