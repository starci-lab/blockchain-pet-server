import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Pet, PetDocument, PetStatus } from './schemas/pet.schema';
import { PetType, PetTypeDocument } from './schemas/pet-type.schema';

@Injectable()
export class PetService {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetType.name) private petTypeModel: Model<PetTypeDocument>,
  ) {}

  async create(createPetDto: CreatePetDto) {
    const createdPet = new this.petModel(createPetDto);
    return createdPet.save();
  }

  async findAll() {
    return this.petModel.find().populate('type').populate('owner_id').exec();
  }

  async findActivePets() {
    return this.petModel
      .find({ status: PetStatus.Active })
      .populate('type')
      .populate('owner_id')
      .exec();
  }

  async findByOwner(ownerId: string) {
    return this.petModel
      .find({ owner_id: new Types.ObjectId(ownerId) })
      .populate('type')
      .exec();
  }

  async findOne(id: string) {
    return this.petModel
      .findById(id)
      .populate('type')
      .populate('owner_id')
      .exec();
  }

  async update(id: string, updatePetDto: UpdatePetDto) {
    return this.petModel
      .findByIdAndUpdate(id, updatePetDto, { new: true })
      .populate('type')
      .exec();
  }

  async remove(id: string) {
    return this.petModel.findByIdAndDelete(id).exec();
  }

  // Create starter pet for new user
  async createStarterPet(userId: string, walletAddress: string) {
    try {
      // Find or create a default pet type (Chog)
      let defaultPetType = await this.petTypeModel.findOne({ name: 'Chog' });

      if (!defaultPetType) {
        // Create default pet type if not exists
        const now = new Date();
        defaultPetType = new this.petTypeModel({
          name: 'Chog',
          description: 'A cute starter pet',
          default_stats: {
            happiness: 90,
            last_update_happiness: now,
            hunger: 90,
            last_update_hunger: now,
            cleanliness: 90,
            last_update_cleanliness: now,
          },
          stat_decay: {
            happiness: { min: 1, max: 2 },
            hunger: { min: 2, max: 3 },
            cleanliness: { min: 1, max: 2 },
          },
          image_url: '/assets/images/Chog/chog_idle.png',
        });
        await defaultPetType.save();
      }

      // Create starter pet for the user
      const starterPet = new this.petModel({
        owner_id: new Types.ObjectId(userId),
        type: defaultPetType._id,
        name: defaultPetType.name,
        stats: defaultPetType.default_stats,
        status: PetStatus.Active,
      });

      await starterPet.save();

      return starterPet;
    } catch (error) {
      console.error(
        `❌ Failed to create starter pet for ${walletAddress}:`,
        error,
      );
      throw error; // Re-throw error to let caller handle it
    }
  }

  async updateStats(petId: string, petStats: any) {
    return this.petModel
      .findByIdAndUpdate(petId, { stats: petStats }, { new: true })
      .exec();
  }
}
