import { Module, forwardRef } from '@nestjs/common'
import { PlayerService } from './player.service'
import { PetHandlerModule } from '../pet/pet-handler.module'

@Module({
  imports: [forwardRef(() => PetHandlerModule)],
  providers: [PlayerService],
  exports: [PlayerService]
})
export class PlayerHandlerModule {}
