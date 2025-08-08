import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameService } from 'src/game/game.service';
import { DatabaseService } from './services/DatabaseService';
import { User, UserSchema } from 'src/api/user/schemas/user.schema';
import { Pet, PetSchema } from 'src/api/pet/schemas/pet.schema';
import { PetType, PetTypeSchema } from 'src/api/pet/schemas/pet-type.schema';
import { StoreItem, StoreItemSchema } from 'src/api/store-item/schemas/store-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: PetType.name, schema: PetTypeSchema },
      { name: StoreItem.name, schema: StoreItemSchema },
    ]),
  ],
  providers: [GameService, DatabaseService],
  exports: [GameService, DatabaseService],
})
export class GameModule {}
