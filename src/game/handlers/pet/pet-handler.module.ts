import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PetService } from './pet.service'
import { User, UserSchema } from 'src/api/user/schemas/user.schema'
import { Pet, PetSchema } from 'src/api/pet/schemas/pet.schema'
import { PetType, PetTypeSchema } from 'src/api/pet/schemas/pet-type.schema'
import { StoreItem, StoreItemSchema } from 'src/api/store-item/schemas/store-item.schema'
import { Poop, PoopSchema } from 'src/api/pet/schemas/poop.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: PetType.name, schema: PetTypeSchema },
      { name: StoreItem.name, schema: StoreItemSchema },
      { name: Poop.name, schema: PoopSchema }
    ])
  ],
  providers: [PetService],
  exports: [PetService]
})
export class PetHandlerModule {}
