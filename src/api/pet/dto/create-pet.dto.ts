import { Types } from 'mongoose';
import { PetStats } from '../schemas/pet-type.schema';
import { PetStatus } from '../schemas/pet.schema';

export class CreatePetDto {
  owner_id: Types.ObjectId;
  type: Types.ObjectId;
  name: string;
  stats: PetStats;
  status?: PetStatus;
}
