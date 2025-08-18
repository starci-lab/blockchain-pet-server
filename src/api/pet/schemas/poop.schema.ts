import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema({ timestamps: true })
export class Poop {
  @Prop({ type: Types.ObjectId, ref: 'Pet', required: true })
  pet_id: Types.ObjectId

  @Prop({ type: Number, required: true, default: 0 })
  position_x: number

  @Prop({ type: Number, required: true, default: 0 })
  position_y: number
}

export type PoopDocument = Poop & Document

export const PoopSchema = SchemaFactory.createForClass(Poop)
