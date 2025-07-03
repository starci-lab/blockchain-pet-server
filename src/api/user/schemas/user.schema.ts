import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { isAddress } from 'ethers';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    unique: true,
    sparse: true,
    maxlength: 50,
    validate: {
      validator: (v: string) => isAddress(v),
      message: (props: { value: string }) =>
        `Invalid wallet address: ${props.value}`,
    },
  })
  wallet_address: string;

  @Prop({ type: String, default: '' })
  nickname?: string;

  @Prop({ type: Date, default: null })
  last_active_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
