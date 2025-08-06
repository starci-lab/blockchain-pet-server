import { Module } from '@nestjs/common'
import { StoreItemService } from './store-item.service'
import { StoreItemController } from './store-item.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { StoreItem, StoreItemSchema } from 'src/api/store-item/schemas/store-item.schema'
import { PetModule } from '../pet/pet.module'

@Module({
  imports: [MongooseModule.forFeature([{ name: StoreItem.name, schema: StoreItemSchema }]), PetModule],
  controllers: [StoreItemController],
  providers: [StoreItemService]
})
export class StoreItemModule {}
