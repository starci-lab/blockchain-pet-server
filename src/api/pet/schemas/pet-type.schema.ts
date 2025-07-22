import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PetStats = {
  happiness: number; // 0 - 100
  last_update_happiness: Date;
  hunger: number; // 0 - 100
  last_update_hunger: Date;
  cleanliness: number; // 0 - 100
  last_update_cleanliness: Date;
};

export type PetTypeDocument = PetType & Document;

@Schema({ timestamps: true })
export class PetType {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: Object, required: true })
  default_stats: PetStats;

  @Prop({ type: String })
  image_url: string;

  @Prop({ type: String })
  description: string;

  @Prop({
    type: Object,
    required: true,
    default: {
      happiness: { min: 1, max: 2 },
      hunger: { min: 2, max: 3 },
      cleanliness: { min: 1, max: 2 },
    },
  })
  stat_decay: {
    happiness: { min: number; max: number };
    hunger: { min: number; max: number };
    cleanliness: { min: number; max: number };
  };
}

export const PetTypeSchema = SchemaFactory.createForClass(PetType);
