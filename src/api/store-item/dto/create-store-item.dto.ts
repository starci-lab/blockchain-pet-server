import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { StoreItemType } from '../schemas/store-item.schema'

export class StatEffectDto {
  @ApiProperty({
    description: 'Hunger effect value',
    example: 20,
    required: false
  })
  @IsOptional()
  @IsNumber()
  hunger?: number

  @ApiProperty({
    description: 'Happiness effect value',
    example: 15,
    required: false
  })
  @IsOptional()
  @IsNumber()
  happiness?: number

  @ApiProperty({
    description: 'Cleanliness effect value',
    example: 10,
    required: false
  })
  @IsOptional()
  @IsNumber()
  cleanliness?: number

  @ApiProperty({
    description: 'Effect duration in minutes',
    example: 60,
    required: false
  })
  @IsOptional()
  @IsNumber()
  duration?: number
}

export class CreateStoreItemDto {
  @ApiProperty({
    description: 'Name of the store item',
    example: 'Premium Dog Food'
  })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({
    description: 'Type of the store item',
    enum: StoreItemType,
    example: StoreItemType.Food
  })
  @IsEnum(StoreItemType)
  @IsNotEmpty()
  type: StoreItemType

  @ApiProperty({
    description: 'Description of the store item',
    example: 'High-quality dog food that increases hunger satisfaction'
  })
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiProperty({
    description: 'Cost in NOM tokens',
    example: 100,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  cost_nom?: number

  @ApiProperty({
    description: 'Stat effects of the item',
    type: StatEffectDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StatEffectDto)
  effect?: StatEffectDto

  @ApiProperty({
    description: 'Image URL of the store item',
    example: 'https://your-bucket-name.s3.amazonaws.com/store-items/foods/cake.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  image_url?: string
}
