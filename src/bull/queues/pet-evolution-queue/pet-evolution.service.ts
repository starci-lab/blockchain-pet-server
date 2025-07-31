import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { JOB_ID, QUEUE_NAME } from 'src/bull/constants/queue.constant'
import { PetQueueService } from '../pet-queue/pet-queue.service'
import { Job, Queue } from 'bullmq'

interface PetEvolutionJobData {
  petId: string
}

@Injectable()
export class PetEvolutionService {
  private readonly logger = new Logger(PetQueueService.name)

  constructor(@InjectQueue(QUEUE_NAME.UPDATE_EVOLUTION) private petEvolutionQueue: Queue) {}

  async onModuleInit() {
    // Initialize update stats jobs
    await this.initializeUpdateEvolutionJobs()
  }

  private async initializeUpdateEvolutionJobs() {
    try {
      await this.addUpdateEvolutionJobs()
      this.logger.log(`Initialized update evolution pets jobs `)
    } catch (error) {
      this.logger.error('Failed to initialize update stats jobs', error)
    }
  }

  async addUpdateEvolutionJobs() {
    try {
      const jobId = JOB_ID.UPDATE_EVOLUTION
      // Check if job already exists
      const existingJob = (await this.petEvolutionQueue.getJob(jobId)) as Job<PetEvolutionJobData> | undefined

      if (existingJob) {
        this.logger.debug(`Update stats job already exists`)
        return
      }

      await this.petEvolutionQueue.add(
        QUEUE_NAME.UPDATE_EVOLUTION,
        {},
        {
          jobId,
          repeat: {
            // Update every 1 minute
            every: 1000
          },
          // Add cleanup options for repeat jobs
          removeOnComplete: 5, // Keep only 5 completed instances
          removeOnFail: 3 // Keep only 3 failed instances
        }
      )

      this.logger.log(`Added update evolution job`)
    } catch (error) {
      this.logger.error('Failed to add update evolution job', error)
    }
  }

  async removeUpdateStatsJob() {
    try {
      const jobId = JOB_ID.UPDATE_EVOLUTION
      await this.petEvolutionQueue.removeRepeatable(QUEUE_NAME.UPDATE_EVOLUTION, {
        jobId,
        // Update every 1 minute
        every: 1000 * 60
      })
      this.logger.log(`Removed update evolution job`)
    } catch (error) {
      this.logger.error(`Failed to remove update evolution job`, error)
      throw error
    }
  }

  // Get job status
  async getJobStatus() {
    const jobId = JOB_ID.UPDATE_EVOLUTION
    const job = (await this.petEvolutionQueue.getJob(jobId)) as Job<PetEvolutionJobData> | undefined
    return job ? await job.getState() : null
  }
}
