import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

type StatEffect = {
  hunger?: number;
  happiness?: number;
  cleanliness?: number;
  duration?: number; // optional - cho hiệu ứng kéo dài theo thời gian (future)
};

export enum StoreItemType {
  Food = 'food',
  Toy = 'toy',
  Soap = 'soap',
  Furniture = 'furniture',
  Decor = 'decor',
  // bạn có thể bổ sung sau nếu cần
}

export type StoreItemDocument = StoreItem & Document;
@Schema({ timestamps: true })
export class StoreItem {
  @Prop({
    type: String,
    unique: true,
  })
  name: string;

  @Prop({
    type: String,
    enum: StoreItemType,
    required: true,
  })
  type: StoreItemType;

  @Prop({
    type: String,
    unique: true,
  })
  description: string;

  @Prop({ type: Number, default: 0 })
  cost_nom: number;

  @Prop({ type: Object })
  effect: StatEffect;
}

export const StoreItemSchema = SchemaFactory.createForClass(StoreItem);
