import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { queuesConfig } from '../../config/queue.config';
import { PetQueueService } from './pet-queue.service';
import { PetModule } from 'src/api/pet/pet.module';
import { PetQueueEvents } from './pet-queue.events';
import { PetProcessor } from './pet.processor';

@Module({
  imports: [BullModule.registerQueue(...queuesConfig), PetModule],
  providers: [PetQueueService, PetQueueEvents, PetProcessor],
})
export class PetQueueModule {}
