import { Injectable } from '@nestjs/common'
import { CreateStoreItemDto } from './dto/create-store-item.dto'
import { UpdateStoreItemDto } from './dto/update-store-item.dto'
import { InjectModel } from '@nestjs/mongoose'
import { StoreItem, StoreItemDocument } from './schemas/store-item.schema'
import { Model } from 'mongoose'

@Injectable()
export class StoreItemService {
  constructor(@InjectModel(StoreItem.name) private readonly storeItemModel: Model<StoreItemDocument>) {}

  async create(createStoreItemDto: CreateStoreItemDto) {
    try {
      const createdStoreItem = new this.storeItemModel(createStoreItemDto)
      return createdStoreItem.save()
    } catch (error) {
      console.error('Error creating store item:', error)
      throw new Error('Failed to create store item')
    }
  }

  async findAll() {
    try {
      const response = await this.storeItemModel.find().populate('petTypeId').exec()
      console.log(123123, response)
      return response
    } catch (error) {
      console.error('Error fetching store items:', error)
      throw new Error('Failed to fetch store items')
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} storeItem`
  }

  update(id: number, updateStoreItemDto: UpdateStoreItemDto) {
    console.log('updateStoreItemDto', updateStoreItemDto)
    return `This action updates a #${id} storeItem`
  }

  remove(id: number) {
    return `This action removes a #${id} storeItem`
  }
}
