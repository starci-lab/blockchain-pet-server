import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'pet',
    }),
  ],
  providers: [],
  exports: [],
})
export class PetQueueModule {}
