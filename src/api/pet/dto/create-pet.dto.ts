import { Types } from 'mongoose'
import { PetStats } from '../schemas/pet-type.schema'
import { PetStatus } from '../schemas/pet.schema'

export class CreatePetDto {
  owner_id: Types.ObjectId
  type: Types.ObjectId
  name: string
  stats: PetStats
  status?: PetStatus
}

export class CreatePetTypeDto {
  name: string
  description: string
  image_url: string
  default_stats: PetStats
  stat_decay: {
    happiness: { min: number; max: number }
    hunger: { min: number; max: number }
    cleanliness: { min: number; max: number }
  }
  time_natural: number
  max_income: number
  income_per_claim: number
  max_income_per_claim: number
}
