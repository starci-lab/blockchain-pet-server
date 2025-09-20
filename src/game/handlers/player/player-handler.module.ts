import { Module } from '@nestjs/common'
import { PlayerService } from './player.service'
import { PetService } from '../pet/pet.service'

@Module({
  providers: [PlayerService, PetService],
  exports: [PlayerService]
})
export class PlayerHandlerModule {}
