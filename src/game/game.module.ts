import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { GameService } from 'src/game/game.service'
import { DatabaseService } from './services/DatabaseService'
import { FoodEmitterModule } from './emitter/food/food-emitter.module'
import { FoodHandlerModule } from './handlers/food/food-handler.module'
import { User, UserSchema } from 'src/api/user/schemas/user.schema'
import { Pet, PetSchema } from 'src/api/pet/schemas/pet.schema'
import { PetType, PetTypeSchema } from 'src/api/pet/schemas/pet-type.schema'
import { StoreItem, StoreItemSchema } from 'src/api/store-item/schemas/store-item.schema'
import { Poop, PoopSchema } from 'src/api/pet/schemas/poop.schema'

@Module({
  imports: [
    FoodEmitterModule,
    FoodHandlerModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: PetType.name, schema: PetTypeSchema },
      { name: StoreItem.name, schema: StoreItemSchema },
      { name: Poop.name, schema: PoopSchema }
    ])
  ],
  providers: [GameService, DatabaseService],
  exports: [GameService, DatabaseService, FoodEmitterModule, FoodHandlerModule]
})
export class GameModule {}
