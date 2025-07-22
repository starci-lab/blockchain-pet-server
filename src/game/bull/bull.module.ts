import { Module } from '@nestjs/common';
import { PetQueueModule } from './queues/pet-queue/pet-queue.module';
import { PetModule } from 'src/api/pet/pet.module';

@Module({
  imports: [PetQueueModule, PetModule],
  providers: [],
  exports: [],
})
export class BullModule {}
