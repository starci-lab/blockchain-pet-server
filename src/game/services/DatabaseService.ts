import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/api/user/schemas/user.schema';
import { Pet, PetDocument } from 'src/api/pet/schemas/pet.schema';
import { PetType, PetTypeDocument } from 'src/api/pet/schemas/pet-type.schema';

@Injectable()
export class DatabaseService {
  private static instance: DatabaseService;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetType.name) private petTypeModel: Model<PetTypeDocument>,
  ) {
    DatabaseService.instance = this;
  }

  static getInstance(): DatabaseService {
    return DatabaseService.instance;
  }

  getUserModel(): Model<UserDocument> {
    return this.userModel;
  }

  getPetModel(): Model<PetDocument> {
    return this.petModel;
  }

  getPetTypeModel(): Model<PetTypeDocument> {
    return this.petTypeModel;
  }
}
