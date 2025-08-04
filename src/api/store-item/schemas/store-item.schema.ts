import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

type StatEffect = {
  hunger?: number
  happiness?: number
  cleanliness?: number
  duration?: number // optional - add duration (future)
}

export enum StoreItemType {
  Food = 'food',
  Toy = 'toy',
  Clean = 'clean',
  Furniture = 'furniture',
  Background = 'background',
  Pet = 'pet' // add pet type if needed
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
}

export const StoreItemSchema = SchemaFactory.createForClass(StoreItem)
