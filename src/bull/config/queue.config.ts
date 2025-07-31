import { QUEUE_NAME, PREFIX } from '../constants/queue.constant'
import { BullConfig } from './bull.config'

export const queuesConfig: BullConfig[] = [
  {
    name: QUEUE_NAME.UPDATE_PET_STATS,
    prefix: PREFIX.PET,
    streams: {
      events: {
        maxLen: 1000
      }
    }
  },
  {
    name: QUEUE_NAME.UPDATE_EVOLUTION,
    prefix: PREFIX.PET,
    streams: {
      events: {
        maxLen: 1000
      }
    }
  }
]

export const getPetQueueConfig = () => ({
  defaultJobOptions: {
    // Time to retry
    attempts: 3,
    // Time to wait between retries
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    // Auto delete job when completed
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000 // Keep max 1000 job
    },
    // Auto delete job when failed
    removeOnFail: {
      age: 86400
    }
  },
  // Limit the number of jobs to be processed
  limiter: {
    max: 1,
    duration: 150
  }
})
