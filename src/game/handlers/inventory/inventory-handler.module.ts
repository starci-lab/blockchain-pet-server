import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { InventoryService } from './inventory.service'
import { PlayerHandlerModule } from '../player/player-handler.module'
import { PetHandlerModule } from '../pet/pet-handler.module'
import { StoreItem, StoreItemSchema } from 'src/api/store-item/schemas/store-item.schema'

@Module({
  imports: [
    forwardRef(() => PlayerHandlerModule),
    forwardRef(() => PetHandlerModule),
    MongooseModule.forFeature([{ name: StoreItem.name, schema: StoreItemSchema }])
  ],
  providers: [InventoryService],
  exports: [InventoryService]
})
export class InventoryHandlerModule {}
