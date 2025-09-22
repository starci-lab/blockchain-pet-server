import { Module, forwardRef } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PlayerService } from './player.service'
import { PetHandlerModule } from '../pet/pet-handler.module'
import { User, UserSchema } from 'src/api/user/schemas/user.schema'
import { Pet, PetSchema } from 'src/api/pet/schemas/pet.schema'

@Module({
  imports: [
    forwardRef(() => PetHandlerModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema }
    ])
  ],
  providers: [PlayerService],
  exports: [PlayerService]
})
export class PlayerHandlerModule {}
