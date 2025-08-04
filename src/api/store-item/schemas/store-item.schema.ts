import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { PetType } from 'src/api/pet/schemas/pet-type.schema'

type StatEffect = {
  hunger?: number
  happiness?: number
  cleanliness?: number
  duration?: number // optional - add duration (future)
}

export enum StoreItemType {
  Food = 'food',
  Toy = 'toy',
  Soap = 'soap',
  Furniture = 'furniture',
  Background = 'background'
  // you can add more types if needed
}

export type StoreItemDocument = StoreItem & Document
@Schema({ timestamps: true })
export class StoreItem {
  @Prop({
    type: String,
    unique: true
  })
  name: string

  @Prop({
    type: String,
    enum: StoreItemType,
    required: true
  })
  type: StoreItemType

  @Prop({
    type: String,
    unique: true
  })
  description: string

  @Prop({ type: Number, default: 0 })
  cost_nom: number

  @Prop({ type: Object })
  effect: StatEffect

  @Prop({ type: String, required: false })
  image: string

  @Prop({ type: [{ type: Types.ObjectId, ref: 'PetType' }] })
  petTypeId: Types.ObjectId[] | PetType[]
}

export const StoreItemSchema = SchemaFactory.createForClass(StoreItem)
