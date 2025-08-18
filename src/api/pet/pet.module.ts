import { Module } from '@nestjs/common'
import { PetService } from './pet.service'
import { PetController } from './pet.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Pet, PetSchema } from 'src/api/pet/schemas/pet.schema'
import { PetType, PetTypeSchema } from 'src/api/pet/schemas/pet-type.schema'
import { PoopSchema } from './schemas/poop.schema'
import { Poop } from './schemas/poop.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      {
        name: PetType.name,
        schema: PetTypeSchema
      },
      {
        name: Poop.name,
        schema: PoopSchema
      }
    ])
  ],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService] // Export PetService so other modules can use it
})
export class PetModule {}
