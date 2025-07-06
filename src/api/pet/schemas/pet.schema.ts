import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PetStats } from 'src/api/pet/schemas/pet-type.schema';

export enum PetStatus {
  Active = 'active',
  Exhausted = 'exhausted',
}

export type PetDocument = Pet & Document;

@Schema({ timestamps: true })
export class Pet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PetType', required: true })
  type: Types.ObjectId;

  @Prop({ type: String })
  name: string;

  @Prop({ type: Object, required: true })
  stats: PetStats;

  @Prop({
    type: String,
    enum: PetStatus,
    default: PetStatus.Active,
  })
  status: PetStatus;
}

export const PetSchema = SchemaFactory.createForClass(Pet);
