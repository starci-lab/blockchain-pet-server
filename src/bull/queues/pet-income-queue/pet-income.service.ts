import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { JOB_ID, QUEUE_NAME } from 'src/bull/constants/queue.constant'
import { Job, Queue } from 'bullmq'

interface PetIncomeJobData {
  petId: string
}

@Injectable()
export class PetIncomeService {
  private readonly logger = new Logger(PetIncomeService.name)

  constructor(@InjectQueue(QUEUE_NAME.CREATE_INCOME) private createIncomeQueue: Queue) {}

  async onModuleInit() {
    // Initialize update stats jobs
    await this.initializeUpdateEvolutionJobs()
  }

  private async initializeUpdateEvolutionJobs() {
    try {
      await this.addCreateIncomePetJob()
      this.logger.log(`Initialized update evolution pets jobs `)
    } catch (error) {
      this.logger.error('Failed to initialize update stats jobs', error)
    }
  }

  // TODO: add update evolution by session after
  async addCreateIncomePetJob() {
    try {
      const jobId = JOB_ID.CREATE_INCOME
      const existingJob = (await this.createIncomeQueue.getJob(jobId)) as Job<PetIncomeJobData> | undefined

      if (existingJob) {
        this.logger.debug(`Create income pet job already exists`)
        return
      }

      await this.createIncomeQueue.add(
        QUEUE_NAME.CREATE_INCOME,
        {},
        {
          jobId,
          repeat: {
            // Update every 1 second
            every: 1000
          },
          // Add cleanup options for repeat jobs
          removeOnComplete: 5, // Keep only 5 completed instances
          removeOnFail: 3 // Keep only 3 failed instances
        }
      )
    } catch (error) {
      this.logger.error('Failed to add create income pet job', error)
    }
  }

  async removeCreateIncomeJob() {
    try {
      const jobId = JOB_ID.CREATE_INCOME
      await this.createIncomeQueue.removeRepeatable(QUEUE_NAME.CREATE_INCOME, {
        jobId,
        // Update every 1 minute
        every: 1000 * 60
      })
      this.logger.log(`Removed update evolution job`)
    } catch (error) {
      this.logger.error(`Failed to remove create income job`, error)
      throw error
    }
  }

  async getCreateIncomeJobStatus() {
    const jobId = JOB_ID.CREATE_INCOME
    const job = (await this.createIncomeQueue.getJob(jobId)) as Job<PetIncomeJobData> | undefined
    return job ? await job.getState() : null
  }
}
