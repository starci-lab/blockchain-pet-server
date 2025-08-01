import { Module } from '@nestjs/common'
import { PetQueueModule } from './queues/pet-queue/pet-queue.module'
import { PetModule } from 'src/api/pet/pet.module'
import { PetEvolutionQueueModule } from './queues/pet-evolution-queue/pet-evolution.module'
import { PetIncomeQueueModule } from './queues/pet-income-queue/pet-income.module'

@Module({
  imports: [PetModule, PetQueueModule, PetEvolutionQueueModule, PetIncomeQueueModule],
  providers: [],
  exports: []
})
export class BullModuleMQ {}
