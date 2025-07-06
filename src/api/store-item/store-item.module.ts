import { Module } from '@nestjs/common';
import { StoreItemService } from './store-item.service';
import { StoreItemController } from './store-item.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StoreItem,
  StoreItemSchema,
} from 'src/api/store-item/schemas/store-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoreItem.name, schema: StoreItemSchema },
    ]),
  ],
  controllers: [StoreItemController],
  providers: [StoreItemService],
})
export class StoreItemModule {}
