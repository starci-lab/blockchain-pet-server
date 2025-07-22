import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PetService } from 'src/api/pet/pet.service';
import { QUEUE_NAME } from '../../constants/queue.constant';
import { Job, Queue } from 'bullmq';

interface PetStatsJobData {
  petId: string;
}

@Injectable()
export class PetQueueService implements OnModuleInit {
  private readonly logger = new Logger(PetQueueService.name);

  constructor(
    private readonly petService: PetService,
    @InjectQueue(QUEUE_NAME.UPDATE_PET_STATS) private petQueue: Queue,
  ) {}

  async onModuleInit() {
    // Initialize update stats jobs
    await this.initializeUpdateStatsJobs();
  }

  private async initializeUpdateStatsJobs() {
    try {
      const pets = await this.petService.findAll();
      for (const pet of pets) {
        await this.addUpdateStatsJob(pet._id as string);
      }
      this.logger.log(`Initialized update stats jobs for ${pets.length} pets`);
    } catch (error) {
      this.logger.error('Failed to initialize update stats jobs', error);
    }
  }

  async addUpdateStatsJob(petId: string) {
    try {
      const jobId = `pet-stats-${petId}`;

      // Check if job already exists
      const existingJob = (await this.petQueue.getJob(jobId)) as
        | Job<PetStatsJobData>
        | undefined;

      if (existingJob) {
        this.logger.debug(`Update stats job already exists for pet ${petId}`);
        return;
      }

      await this.petQueue.add(
        QUEUE_NAME.UPDATE_PET_STATS,
        { petId },
        {
          jobId,
          repeat: {
            // Update every 5 minutes
            every: 5 * 60 * 1000,
          },
        },
      );

      this.logger.log(`Added update stats job for pet ${petId}`);
    } catch (error) {
      this.logger.error(
        `Failed to add update stats job for pet ${petId}`,
        error,
      );
      throw error;
    }
  }

  async updatePetStats() {
    try {
      const pets = await this.petService.findAll();
      this.logger.log(`Updating stats for ${pets.length} pets`);
      return pets;
    } catch (error: any) {
      console.log('error at updatePetStats', error);
      throw error;
    }
  }

  async removeUpdateStatsJob(petId: string) {
    try {
      const jobId = `pet-stats-${petId}`;
      await this.petQueue.removeRepeatable(QUEUE_NAME.UPDATE_PET_STATS, {
        jobId,
        every: 5 * 60 * 1000,
      });
      this.logger.log(`Removed update stats job for pet ${petId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove update stats job for pet ${petId}`,
        error,
      );
      throw error;
    }
  }

  // Get job status
  async getJobStatus(petId: string) {
    const jobId = `pet-stats-${petId}`;
    const job = (await this.petQueue.getJob(jobId)) as
      | Job<PetStatsJobData>
      | undefined;
    return job ? await job.getState() : null;
  }
}
