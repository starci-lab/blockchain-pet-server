import { ApiProperty } from '@nestjs/swagger'

export class PetStatsResponseDto {
  @ApiProperty({
    description: 'Happiness level (0-100)',
    example: 90,
    minimum: 0,
    maximum: 100
  })
  happiness: number

  @ApiProperty({
    description: 'Last update time for happiness',
    example: '2024-08-04T10:30:00.000Z'
  })
  last_update_happiness: Date

  @ApiProperty({
    description: 'Hunger level (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100
  })
  hunger: number

  @ApiProperty({
    description: 'Last update time for hunger',
    example: '2024-08-04T10:30:00.000Z'
  })
  last_update_hunger: Date

  @ApiProperty({
    description: 'Cleanliness level (0-100)',
    example: 95,
    minimum: 0,
    maximum: 100
  })
  cleanliness: number

  @ApiProperty({
    description: 'Last update time for cleanliness',
    example: '2024-08-04T10:30:00.000Z'
  })
  last_update_cleanliness: Date
}

export class StatDecayResponseDto {
  @ApiProperty({
    description: 'Happiness decay range',
    example: { min: 1, max: 2 }
  })
  happiness: { min: number; max: number }

  @ApiProperty({
    description: 'Hunger decay range',
    example: { min: 2, max: 3 }
  })
  hunger: { min: number; max: number }

  @ApiProperty({
    description: 'Cleanliness decay range',
    example: { min: 1, max: 2 }
  })
  cleanliness: { min: number; max: number }
}

export class ResponsePetTypeDto {
  @ApiProperty({
    description: 'Pet type ID',
    example: '507f1f77bcf86cd799439011'
  })
  _id: string

  @ApiProperty({
    description: 'Pet type name',
    example: 'Chog'
  })
  name: string

  @ApiProperty({
    description: 'Pet type description',
    example: 'A cute starter pet'
  })
  description?: string

  @ApiProperty({
    description: 'Pet type image URL',
    example: '/assets/images/Chog/chog_idle.png'
  })
  image_url?: string

  @ApiProperty({
    description: 'Default stats for this pet type',
    type: PetStatsResponseDto
  })
  default_stats: PetStatsResponseDto

  @ApiProperty({
    description: 'Stat decay configuration',
    type: StatDecayResponseDto
  })
  stat_decay: StatDecayResponseDto

  @ApiProperty({
    description: 'Time to natural evolution (hours)',
    example: 10,
    minimum: 1
  })
  time_natural: number

  @ApiProperty({
    description: 'Maximum income this pet type can earn',
    example: 100,
    minimum: 0
  })
  max_income: number

  @ApiProperty({
    description: 'Income per claim',
    example: 1,
    minimum: 0
  })
  income_per_claim: number

  @ApiProperty({
    description: 'Maximum income per claim',
    example: 15,
    minimum: 0
  })
  max_income_per_claim: number

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-08-04T10:30:00.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-08-04T10:30:00.000Z'
  })
  updatedAt: Date
}

export class ResponsePetTypeListDto {
  @ApiProperty({
    description: 'List of pet types',
    type: [ResponsePetTypeDto]
  })
  data: ResponsePetTypeDto[]

  @ApiProperty({
    description: 'Total count of pet types',
    example: 5
  })
  total: number

  @ApiProperty({
    description: 'Current page',
    example: 1
  })
  page?: number

  @ApiProperty({
    description: 'Items per page',
    example: 10
  })
  limit?: number
}
