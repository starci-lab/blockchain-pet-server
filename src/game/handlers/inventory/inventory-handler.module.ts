import { Module, forwardRef } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { PlayerHandlerModule } from '../player/player-handler.module'
import { PetHandlerModule } from '../pet/pet-handler.module'

@Module({
  imports: [forwardRef(() => PlayerHandlerModule), forwardRef(() => PetHandlerModule)],
  providers: [InventoryService],
  exports: [InventoryService]
})
export class InventoryHandlerModule {}
