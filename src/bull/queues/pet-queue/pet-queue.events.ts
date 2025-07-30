import {
  OnQueueEvent,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import { QUEUE_NAME } from '../../constants/queue.constant';
import { Logger } from '@nestjs/common';

@QueueEventsListener(QUEUE_NAME.UPDATE_PET_STATS, {
  blockingTimeout: 3000,
})
export class PetQueueEvents extends QueueEventsHost {
  private readonly logger = new Logger(PetQueueEvents.name);

  @OnQueueEvent('added')
  onAdded(job: { jobId: string; name: string }) {
    this.logger.log(
      `Job ${job.jobId} of type ${job.name} has been added to the queue`,
    );
  }

  @OnQueueEvent('waiting')
  onWaiting(job: { jobId: string; prev?: string }) {
    this.logger.log(`Job ${job.jobId} is waiting`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: { jobId: string }) {
    this.logger.log(`Job ${job.jobId} has been completed`);
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string }) {
    this.logger.error(`Job ${job.jobId} has failed: ${job.failedReason}`);
  }
}
