import { Module } from '@nestjs/common'
import { PetService } from './pet.service'

@Module({
  providers: [PetService],
  exports: [PetService]
})
export class PetHandlerModule {}
