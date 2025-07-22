import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QUEUE_NAME } from '../../constants/queue.constant';
import { PetService } from 'src/api/pet/pet.service';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor(QUEUE_NAME.UPDATE_PET_STATS)
export class PetProcessor extends WorkerHost {
  private readonly logger = new Logger(PetProcessor.name);

  constructor(private readonly petService: PetService) {
    super();
  }

  async process(job: Job<{ petId: string }>) {
    try {
      this.logger.log(`Processing job ${job.id} for pet ${job.data.petId}`);

      const pet = await this.petService.findOne(job.data.petId);
      if (!pet) {
        throw new Error(`Pet not found with id ${job.data.petId}`);
      }

      // Here you should implement your pet stats update logic
      // For example:
      // await this.petService.updateStats(pet._id, {
      //   hunger: calculateNewHunger(pet),
      //   happiness: calculateNewHappiness(pet),
      //   // etc...
      // });

      this.logger.log(
        `Successfully processed job ${job.id} for pet ${job.data.petId}`,
      );
      return pet;
    } catch (error) {
      console.log('error at pet processor', error);
      throw error;
    }
  }
}
