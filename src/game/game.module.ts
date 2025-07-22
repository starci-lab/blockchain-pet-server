import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameService } from 'src/game/game.service';
import { DatabaseService } from './services/DatabaseService';
import { User, UserSchema } from 'src/api/user/schemas/user.schema';
import { Pet, PetSchema } from 'src/api/pet/schemas/pet.schema';
import { PetType, PetTypeSchema } from 'src/api/pet/schemas/pet-type.schema';
import { BullModule } from './bull/bull.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Pet.name, schema: PetSchema },
      { name: PetType.name, schema: PetTypeSchema },
    ]),
    BullModule,
  ],
  providers: [GameService, DatabaseService],
  exports: [GameService, DatabaseService],
})
export class GameModule {}
