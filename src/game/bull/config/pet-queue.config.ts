import { BullConfig } from './bull.config';

export const petQueueConfig: BullConfig = {
  name: 'pet',
  connection: {
    host: 'localhost',
  },
};
