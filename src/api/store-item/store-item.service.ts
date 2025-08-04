import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { InjectModel } from '@nestjs/mongoose'
import { StoreItem, StoreItemDocument, StoreItemType } from './schemas/store-item.schema'
import { Model } from 'mongoose'
import { ResponseItemDto, ResponseStoreItemDto } from './dto/response-store-item.dto'
import { plainToInstance } from 'class-transformer'
import { PetService } from '../pet/pet.service'
import { ResponsePetTypeDto } from '../pet/dto/response-petType.dto'

@Injectable()
export class StoreItemService {
  constructor(
    @InjectModel(StoreItem.name) private readonly storeItemModel: Model<StoreItemDocument>,
    private readonly petService: PetService
  ) {}

  async create(createStoreItemDto: CreateStoreItemDto) {
    try {
      const existingItem = await this.storeItemModel.findOne({ name: createStoreItemDto.name }).exec()
      if (existingItem) {
        throw new BadRequestException(`Store item with name ${createStoreItemDto.name} already exists.`)
      }

      const createdStoreItem = new this.storeItemModel(createStoreItemDto)
      return createdStoreItem.save()
    } catch (error) {
      console.error('Error creating store item:', error)
      throw error
    }
  }

  async findAll(): Promise<ResponseStoreItemDto> {
    try {
      const listStoreItems = await this.storeItemModel.find().lean().exec()
      const petTypes = await this.petService.findAllPetTypes()
      return this.mapToResponseDto(listStoreItems, petTypes)
    } catch (error) {
      console.error('Error fetching store items:', error)
      throw new Error('Failed to fetch store items')
    }
  }

  async findOne(id: string): Promise<ResponseItemDto> {
    try {
      const item = await this.storeItemModel.findById(id).exec()
      return plainToInstance(ResponseItemDto, item)
    } catch (error) {
      console.error('Error fetching store item:', error)
      throw new Error('Failed to fetch store item')
    }
  }

  update(id: number, updateStoreItemDto: UpdateStoreItemDto) {
    console.log('updateStoreItemDto', updateStoreItemDto)
    return `This action updates a #${id} storeItem`
  }

  remove(id: number) {
    return `This action removes a #${id} storeItem`
  }

  private mapToResponseDto(storeItems?: StoreItem[], petTypes?: ResponsePetTypeDto[]): ResponseStoreItemDto {
    const map: ResponseStoreItemDto = {
      [StoreItemType.Food]: [],
      [StoreItemType.Toy]: [],
      [StoreItemType.Clean]: [],
      [StoreItemType.Furniture]: [],
      [StoreItemType.Background]: [],
      [StoreItemType.Pet]: []
    }

    storeItems?.forEach((item) => {
      if (item.type !== StoreItemType.Pet && map[item.type]) {
        map[item.type]!.push(plainToInstance(ResponseItemDto, item))
      }
    })

    petTypes?.forEach((petType) => {
      map[StoreItemType.Pet]!.push(plainToInstance(ResponsePetTypeDto, petType))
    })

    return map
  }
}
