import { ApiProperty } from '@nestjs/swagger'
import { StoreItemType } from '../schemas/store-item.schema'

export class StatEffectResponseDto {
  @ApiProperty({
    description: 'Hunger effect value',
    example: 20,
    required: false
  })
  hunger?: number

  @ApiProperty({
    description: 'Happiness effect value',
    example: 15,
    required: false
  })
  happiness?: number

  @ApiProperty({
    description: 'Cleanliness effect value',
    example: 10,
    required: false
  })
  cleanliness?: number

  @ApiProperty({
    description: 'Effect duration in minutes',
    example: 60,
    required: false
  })
  duration?: number
}

export class ResponseStoreItemDto {
  @ApiProperty({
    description: 'Store item ID',
    example: '60c72b2f9b1e8b001c8e4d3a'
  })
  _id: string

  @ApiProperty({
    description: 'Name of the store item',
    example: 'Premium Dog Food'
  })
  name: string

  @ApiProperty({
    description: 'Type of the store item',
    enum: StoreItemType,
    example: StoreItemType.Food
  })
  type: StoreItemType

  @ApiProperty({
    description: 'Description of the store item',
    example: 'High-quality dog food that increases hunger satisfaction'
  })
  description: string

  @ApiProperty({
    description: 'Cost in NOM tokens',
    example: 100
  })
  cost_nom: number

  @ApiProperty({
    description: 'Stat effects of the item',
    type: StatEffectResponseDto,
    required: false
  })
  effect?: StatEffectResponseDto

  @ApiProperty({
    description: 'Image URL of the store item',
    example: 'https://example.com/dog_food.jpg',
    required: false
  })
  image?: string

  @ApiProperty({
    description: 'Associated pet type IDs',
    example: ['60c72b2f9b1e8b001c8e4d3a'],
    type: [String],
    required: false
  })
  petTypeId?: string[]

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T00:00:00.000Z'
  })
  updatedAt: Date
}
