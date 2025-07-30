export type BullConfig = {
  name: string;
  prefix: string;
  streams: {
    events: {
      maxLen: number;
    };
  };
};
