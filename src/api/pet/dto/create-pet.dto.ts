import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateNested, IsObject, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { Types } from 'mongoose'
import { PetStats } from '../schemas/pet-type.schema'
import { PetStatus } from '../schemas/pet.schema'

export class PetStatsDto {
  @ApiProperty({
    description: 'Initial happiness level (0-100)',
    example: 90,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  happiness: number

  @ApiProperty({
    description: 'Last update time for happiness',
    example: '2024-08-05T10:30:00.000Z'
  })
  last_update_happiness: Date

  @ApiProperty({
    description: 'Initial hunger level (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  hunger: number

  @ApiProperty({
    description: 'Last update time for hunger',
    example: '2024-08-05T10:30:00.000Z'
  })
  last_update_hunger: Date

  @ApiProperty({
    description: 'Initial cleanliness level (0-100)',
    example: 95,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  cleanliness: number

  @ApiProperty({
    description: 'Last update time for cleanliness',
    example: '2024-08-05T10:30:00.000Z'
  })
  last_update_cleanliness: Date
}

export class StatDecayRangeDto {
  @ApiProperty({
    description: 'Minimum decay value',
    example: 1,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  min: number

  @ApiProperty({
    description: 'Maximum decay value',
    example: 2,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  max: number
}

export class StatDecayDto {
  @ApiProperty({
    description: 'Happiness decay range per hour',
    type: StatDecayRangeDto
  })
  @ValidateNested()
  @Type(() => StatDecayRangeDto)
  happiness: StatDecayRangeDto

  @ApiProperty({
    description: 'Hunger decay range per hour',
    type: StatDecayRangeDto
  })
  @ValidateNested()
  @Type(() => StatDecayRangeDto)
  hunger: StatDecayRangeDto

  @ApiProperty({
    description: 'Cleanliness decay range per hour',
    type: StatDecayRangeDto
  })
  @ValidateNested()
  @Type(() => StatDecayRangeDto)
  cleanliness: StatDecayRangeDto
}

export class CreatePetDto {
  owner_id: Types.ObjectId
  type: Types.ObjectId
  name: string
  stats: PetStats
  status?: PetStatus
}

export class CreatePetTypeDto {
  @ApiProperty({
    description: 'Name of the pet type',
    example: 'Chog'
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    description: 'Description of the pet type',
    example: 'A cute starter pet with loyal nature'
  })
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiProperty({
    description: 'Image URL of the pet type',
    example: 'https:/assets/images/Chog/chog_idle.png'
  })
  @IsString()
  @IsNotEmpty()
  image_url: string

  @ApiProperty({
    description: 'Default stats for this pet type',
    type: PetStatsDto
  })
  @ValidateNested()
  @Type(() => PetStatsDto)
  @IsObject()
  default_stats: PetStats

  @ApiProperty({
    description: 'Stat decay configuration for this pet type',
    type: StatDecayDto
  })
  @ValidateNested()
  @Type(() => StatDecayDto)
  @IsObject()
  stat_decay: {
    happiness: { min: number; max: number }
    hunger: { min: number; max: number }
    cleanliness: { min: number; max: number }
  }

  @ApiProperty({
    description: 'Time required for natural evolution (in hours)',
    example: 10,
    minimum: 1
  })
  @IsNumber()
  @Min(1)
  time_natural: number

  @ApiProperty({
    description: 'Maximum income this pet type can earn',
    example: 100,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  max_income: number

  @ApiProperty({
    description: 'Income earned per claim',
    example: 1,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  income_per_claim: number

  @ApiProperty({
    description: 'Maximum income per single claim',
    example: 15,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  max_income_per_claim: number

  @ApiProperty({
    description: 'Cost in NOM tokens to buy this pet type',
    example: 50,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_nom?: number
}
