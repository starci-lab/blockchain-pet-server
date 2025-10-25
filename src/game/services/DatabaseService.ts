import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { ClientSession, Connection, Model } from 'mongoose'
import { User, UserDocument } from 'src/api/user/schemas/user.schema'
import { Pet, PetDocument } from 'src/api/pet/schemas/pet.schema'
import { PetType, PetTypeDocument } from 'src/api/pet/schemas/pet-type.schema'
import { StoreItem, StoreItemDocument } from 'src/api/store-item/schemas/store-item.schema'
import { Poop, PoopDocument } from 'src/api/pet/schemas/poop.schema'

@Injectable()
export class DatabaseService {
  private static instance: DatabaseService

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetType.name) private petTypeModel: Model<PetTypeDocument>,
    @InjectModel(StoreItem.name) private storeItemModel: Model<StoreItemDocument>,
    @InjectModel(Poop.name) private poopModel: Model<PoopDocument>,
    @InjectConnection() private readonly connection: Connection
  ) {
    DatabaseService.instance = this
  }

  static getInstance(): DatabaseService {
    return DatabaseService.instance
  }

  getUserModel(): Model<UserDocument> {
    return this.userModel
  }

  getPetModel(): Model<PetDocument> {
    return this.petModel
  }

  getPetTypeModel(): Model<PetTypeDocument> {
    return this.petTypeModel
  }

  getStoreItemModel(): Model<StoreItemDocument> {
    return this.storeItemModel
  }

  getPoopModel(): Model<PoopDocument> {
    return this.poopModel
  }

  /**
   * Helper chạy logic trong MongoDB transaction
   * @param operation Hàm callback async chứa các thao tác DB
   */
  async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession()
    try {
      let result: T | undefined

      await session.withTransaction(async () => {
        result = await operation(session)
      })

      if (result === undefined) {
        throw new Error('Transaction operation returned undefined result')
      }

      return result
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      throw error
    } finally {
      await session.endSession()
    }
  }
}
