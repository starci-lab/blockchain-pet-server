import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PetService } from 'src/api/pet/pet.service';
import { JOB_ID, QUEUE_NAME } from '../../constants/queue.constant';
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
      await this.addUpdateStatsJob();
      this.logger.log(`Initialized update stats pets jobs `);
    } catch (error) {
      this.logger.error('Failed to initialize update stats jobs', error);
    }
  }

  async addUpdateStatsJob() {
    try {
      const jobId = JOB_ID.UPDATE_PET_STATS;

      // Check if job already exists
      const existingJob = (await this.petQueue.getJob(jobId)) as
        | Job<PetStatsJobData>
        | undefined;

      if (existingJob) {
        this.logger.debug(`Update stats job already exists`);
        return;
      }

      await this.petQueue.add(
        QUEUE_NAME.UPDATE_PET_STATS,
        {},
        {
          jobId,
          repeat: {
            // Update every 1 hours
            every: 1000,
          },
          // Add cleanup options for repeat jobs
          removeOnComplete: 5, // Keep only 5 completed instances
          removeOnFail: 3, // Keep only 3 failed instances
        },
      );

      this.logger.log(`Added update stats job`);
    } catch (error) {
      this.logger.error(`Failed to add update stats job`, error);
      throw error;
    }
  }

  async removeUpdateStatsJob() {
    try {
      const jobId = JOB_ID.UPDATE_PET_STATS;
      await this.petQueue.removeRepeatable(QUEUE_NAME.UPDATE_PET_STATS, {
        jobId,
        every: 60 * 60 * 1000,
      });
      this.logger.log(`Removed update stats job`);
    } catch (error) {
      this.logger.error(`Failed to remove update stats job`, error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus() {
    const jobId = JOB_ID.UPDATE_PET_STATS;
    const job = (await this.petQueue.getJob(jobId)) as
      | Job<PetStatsJobData>
      | undefined;
    return job ? await job.getState() : null;
  }
}
