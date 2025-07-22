import { Module } from '@nestjs/common';
import { PetQueueModule } from './queues/pet-queue/pet-queue.module';

@Module({
  imports: [PetQueueModule],
})
export class BullModule {}
