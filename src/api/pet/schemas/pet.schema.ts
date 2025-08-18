import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { PetStats, PetType } from 'src/api/pet/schemas/pet-type.schema'

export enum PetStatus {
  Active = 'active',
  Exhausted = 'exhausted'
}

export type PetDocument = Pet &
  Document & {
    createdAt: Date
    updatedAt: Date
  }

@Schema({ timestamps: true })
export class Pet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner_id: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'PetType', required: true })
  type: Types.ObjectId | PetType

  @Prop({ type: String })
  name: string

  @Prop({
    type: {
      happiness: { type: Number, required: true },
      last_update_happiness: { type: Date, required: true },
      hunger: { type: Number, required: true },
      last_update_hunger: { type: Date, required: true },
      cleanliness: { type: Number, required: true },
      last_update_cleanliness: { type: Date, required: true }
    },
    required: true
  })
  stats: PetStats

  @Prop({
    type: String,
    enum: PetStatus,
    default: PetStatus.Active
  })
  status: PetStatus

  @Prop({ type: Boolean, required: true, default: false })
  isAdult: boolean

  @Prop({ type: Number, required: true, default: 0 })
  token_income: number

  @Prop({ type: Number, required: true, default: 0 })
  total_income: number

  @Prop({ type: Date, required: true, default: () => new Date() })
  last_claim: Date
}

export const PetSchema = SchemaFactory.createForClass(Pet)
