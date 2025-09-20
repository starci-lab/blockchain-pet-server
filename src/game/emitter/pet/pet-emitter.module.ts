import { Module } from '@nestjs/common'
import { PetEmitters } from '../PetEmitters'

@Module({
  providers: [PetEmitters],
  exports: [PetEmitters]
})
export class PetEmitterModule {}
