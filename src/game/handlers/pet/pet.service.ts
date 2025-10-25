import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Model, Connection } from 'mongoose'
import { Pet, PetPoop, Player } from '../../schemas/game-room.schema'
import { GAME_CONFIG } from '../../config/GameConfig'
import { eventBus } from 'src/shared/even-bus'
import { ResponseBuilder } from '../../utils/ResponseBuilder'
import { InventoryService } from '../inventory/inventory.service'
import { MapSchema } from '@colyseus/schema'
import { PetStatus, PetDocument } from 'src/api/pet/schemas/pet.schema'
import { PetEventData, DBPet, PoopEvenData } from '../../types/GameTypes'
import { Types } from 'mongoose'
import { PetStats as GamePetStats } from '../../types/GameTypes'
import { EMITTER_EVENT_BUS } from '../../constants/message-event-bus'
import { MESSAGE_COLYSEUS } from '../../constants/message-colyseus'
import { PetType, PetTypeDocument } from 'src/api/pet/schemas/pet-type.schema'
import { Poop, PoopDocument } from 'src/api/pet/schemas/poop.schema'
import { User, UserDocument } from 'src/api/user/schemas/user.schema'
import { StoreItem, StoreItemDocument } from 'src/api/store-item/schemas/store-item.schema'
import { DatabaseService } from '../../services/DatabaseService'

@Injectable()
export class PetService {
  constructor(
    @InjectConnection() private connection: Connection,
    private readonly databaseService: DatabaseService
  ) {
    this.setupEventListeners()
  }

  // Lazy load models - chỉ tạo khi cần dùng
  private get petModel(): Model<PetDocument> {
    return this.connection.model<PetDocument>(Pet.name)
  }

  private get petTypeModel(): Model<PetTypeDocument> {
    return this.connection.model<PetTypeDocument>(PetType.name)
  }

  private get poopModel(): Model<PoopDocument> {
    return this.connection.model<PoopDocument>(Poop.name)
  }

  private get userModel(): Model<UserDocument> {
    return this.connection.model<UserDocument>(User.name)
  }

  private get storeItemModel(): Model<StoreItemDocument> {
    return this.connection.model<StoreItemDocument>(StoreItem.name)
  }

  private setupEventListeners() {
    console.log('🎧 Initializing PetService event listeners...')

    // Listen for pet creation events
    eventBus.on(EMITTER_EVENT_BUS.PET.BUY_PET, (eventData: PetEventData) => {
      void this.handleBuyPet(eventData)
    })

    // Listen for pet removal events
    eventBus.on(EMITTER_EVENT_BUS.PET.REMOVE_PET, (eventData: PetEventData) => this.handleRemovePet(eventData))

    // Listen for pet feeding events
    eventBus.on(EMITTER_EVENT_BUS.PET.FEED_PET, (eventData: PetEventData) => this.handleFeedPet(eventData))

    // Listen for pet playing events
    eventBus.on(EMITTER_EVENT_BUS.PET.PLAY_WITH_PET, (eventData: PetEventData) => this.handlePlayWithPet(eventData))

    // Listen for pet cleaning events
    eventBus.on('pet.clean', (eventData: PetEventData) => this.handleCleanPet(eventData))

    // Listen for pet eated food events
    eventBus.on(EMITTER_EVENT_BUS.PET.EATED_FOOD, (eventData: PetEventData) => {
      void this.handleEatedFood(eventData)
    })

    // Listen for pet cleaned events
    eventBus.on(EMITTER_EVENT_BUS.PET.CLEANED_PET, (eventData: PetEventData) => {
      void this.handleCleanedPet(eventData)
    })

    // Listen for pet played events
    eventBus.on(EMITTER_EVENT_BUS.PET.PLAYED_PET, (eventData: PetEventData) => {
      void this.handlePlayedPet(eventData)
    })

    // Listen for pet create poop events
    eventBus.on(EMITTER_EVENT_BUS.PET.CREATE_POOP, (eventData: PoopEvenData) => {
      void this.handleCreatePoop(eventData)
    })

    console.log('✅ PetService event listeners initialized')
  }

  // Static method for initializing event listeners (for backward compatibility)
  static initializeEventListeners() {
    console.log('🎧 Initializing PetService event listeners...')

    // For now, we'll just log that the service is initialized
    // The actual event handling will be done by the injected instances
    console.log('✅ PetService event listeners initialized (handled by injected instances)')
  }

  // Helper methods for responses
  private createSuccessResponse(data: Record<string, any>, message: string) {
    return {
      success: true,
      data,
      message,
      timestamp: Date.now()
    }
  }

  private createErrorResponse(message: string) {
    return {
      success: false,
      error: message,
      timestamp: Date.now()
    }
  }

  // TODO: fetch pets from database
  async fetchPetsFromDatabase(walletAddress: string): Promise<Pet[]> {
    if (!walletAddress) return []
    try {
      // Use injected models directly
      // Find user by wallet address
      const user = await this.userModel.findOne({ wallet_address: walletAddress.toLowerCase() }).exec()
      if (!user) return []
      // Find all pets by user._id
      const dbPets = await this.petModel.find({ owner_id: user._id }).populate('poops').populate('type').exec()
      // Convert dbPets to game Pet objects
      return dbPets.map((dbPet) => {
        const pet = new Pet()
        const gamePoops = (dbPet.poops ?? []).map((poop: PoopDocument) => {
          const gamePoop = new PetPoop()
          gamePoop.id = (poop._id as Types.ObjectId).toString()
          gamePoop.petId = (dbPet._id as Types.ObjectId).toString()
          gamePoop.positionX = +poop.position_x
          gamePoop.positionY = +poop.position_y
          return gamePoop
        })

        pet.id = (dbPet._id as Types.ObjectId).toString()
        pet.ownerId = walletAddress
        pet.petType = (dbPet.type as PetType)?.name ?? 'chog'
        pet.hunger = dbPet.stats?.hunger ?? 50
        pet.happiness = dbPet.stats?.happiness ?? 50
        pet.cleanliness = dbPet.stats?.cleanliness ?? 50
        pet.lastUpdateHappiness = dbPet.stats?.last_update_happiness?.toISOString() ?? ''
        pet.lastUpdateHunger = dbPet.stats?.last_update_hunger?.toISOString() ?? ''
        pet.lastUpdateCleanliness = dbPet.stats?.last_update_cleanliness?.toISOString() ?? ''
        pet.isAdult = dbPet.isAdult ?? false
        pet.birthTime = dbPet.createdAt?.toISOString() ?? ''
        pet.growthDuration = (dbPet.type as PetType)?.time_natural || 0
        pet.incomeCycleTime = dbPet.token_income || 0
        pet.incomePerCycle = (dbPet.type as PetType)?.max_income_per_claim || 0
        pet.lastClaim = dbPet.last_claim?.toISOString() ?? ''
        pet.poops = gamePoops
        pet.lastUpdated = Date.now()
        return pet
      })
    } catch (err) {
      console.error('❌ Error fetching pets from DB:', err)
      return []
    }
  }

  // Event handlers
  private isValidPetId(petId: string | undefined): petId is string {
    return typeof petId === 'string' && petId.length > 0
  }

  private async handleBuyPet(eventData: PetEventData) {
    const { sessionId, petType, petTypeId, room, client, isBuyPet } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) return

    // Check if petType is valid
    if (!petType) {
      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Pet type not found'))
      return
    }
    let petId: string = ''

    if (isBuyPet) {
      // Logic buy pet
      const PET_PRICE = 50
      if (typeof player.tokens !== 'number' || player.tokens < PET_PRICE) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Not enough tokens'))
        return
      }
      try {
        //TODO: find by type pet ID
        const findPetType = await this.petTypeModel.findOne({
          _id: petTypeId
        })
        if (!findPetType) throw new Error('Pet type not found in DB')

        const user = await this.userModel.findOne({ wallet_address: player.walletAddress.toLowerCase() }).exec()
        if (!user) throw new Error('User not found in DB')

        // Tạo pet trước
        const createdPetDoc = await this.petModel.create({
          owner_id: user._id,
          type: new Types.ObjectId(petTypeId),
          stats: {
            hunger: 100,
            happiness: 100,
            cleanliness: 100,
            last_update_happiness: new Date(),
            last_update_hunger: new Date(),
            last_update_cleanliness: new Date()
          }
        })
        await createdPetDoc.save()
        petId = (createdPetDoc._id as Types.ObjectId).toString()

        // Chỉ trừ token sau khi tạo pet thành công
        player.tokens -= PET_PRICE

        // Lưu token mới vào DB
        await this.userModel.updateOne(
          { wallet_address: player.walletAddress.toLowerCase() },
          { $inc: { token_nom: -PET_PRICE } }
        )

        // Lấy lại danh sách pet mới nhất từ DB
        const petsFromDb = await this.fetchPetsFromDatabase(player.walletAddress)
        // Cập nhật state cho player
        if (!player.pets) player.pets = new MapSchema<Pet>()
        else player.pets.clear()
        petsFromDb.forEach((pet: Pet) => {
          room.state.pets.set(pet.id, pet)
          player.pets.set(pet.id, pet)
        })
        player.totalPetsOwned = petsFromDb.length

        // Gửi response về client
        client.send(
          MESSAGE_COLYSEUS.ACTION.RESPONSE,
          this.createSuccessResponse(
            {
              currentTokens: player.tokens,
              pets: petsFromDb
            },
            'Buy pet successfully'
          )
        )

        room.loggingService.logStateChange('PET_BOUGHT', {
          petType,
          ownerId: sessionId,
          ownerName: player.name,
          totalPets: player.totalPetsOwned
        })
        console.log(`✅ Player ${player.name} mua pet thành công. Token còn lại: ${player.tokens}`)
      } catch (err) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.RESPONSE,
          this.createErrorResponse(err instanceof Error ? err.message : 'Fail to pet')
        )
      }
      return
    }

    // Legacy: tạo pet local (không dùng nữa, chỉ fallback nếu cần)
    console.log(`🐕 [PetService] Creating pet ${petId} for ${player.name}`)

    const pet = this.createPet(petId, sessionId, petType)

    // Add pet to room state
    room.state.pets.set(pet.id, pet)

    // Add pet to player's pets collection
    if (!player.pets) {
      player.pets = new MapSchema<Pet>()
    }
    player.pets.set(pet.id, pet)

    // Update player's pet count
    player.totalPetsOwned = this.getPlayerPets(player).length

    room.loggingService.logStateChange('PET_CREATED', {
      petId: pet.id,
      ownerId: sessionId,
      ownerName: player.name,
      petType,
      totalPets: player.totalPetsOwned
    })

    // Send updated pets state to client
    console.log('🔄 Sending pets-state-sync after create pet...')
    const playerPets = this.getPlayerPets(player)
    console.log(`📤 Player ${player.name} has ${playerPets.length} pets to sync`)
    client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(playerPets))

    console.log(`✅ Pet ${petId} created for ${player.name}. Total pets: ${player.totalPetsOwned}`)
  }

  private handleRemovePet(eventData: PetEventData) {
    const { sessionId, petId, room, client } = eventData
    const player = room.state.players.get(sessionId)
    if (!player || !petId) {
      console.log(`❌ Remove pet failed - invalid player/pet`)
      return
    }
    const pet = room.state.pets.get(petId)

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Remove pet failed - invalid player/pet or ownership`)
      return
    }

    console.log(`🗑️ [PetService] Removing pet ${petId} for ${player.name}`)

    // Remove pet from room state
    room.state.pets.delete(petId)

    // Remove pet from player's pets collection
    if (player.pets) {
      player.pets.delete(petId)
    }

    // Update player's pet count
    player.totalPetsOwned = this.getPlayerPets(player).length

    room.loggingService.logStateChange('PET_REMOVED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      totalPets: player.totalPetsOwned
    })

    // Send updated pets state to client
    console.log('🔄 Sending pets-state-sync after remove pet...')
    const playerPets = this.getPlayerPets(player)
    console.log(`📤 Player ${player.name} has ${playerPets.length} pets remaining`)
    client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(playerPets))

    console.log(`✅ Pet ${petId} removed for ${player.name}. Remaining pets: ${player.totalPetsOwned}`)
  }

  private handleFeedPet(eventData: PetEventData) {
    const { sessionId, petId, foodType, room, client } = eventData
    if (!this.isValidPetId(petId) || !foodType) return

    const player = room.state.players.get(sessionId)
    if (!player) return

    const pet = room.state.pets.get(petId)
    if (!pet || pet.ownerId !== sessionId) {
      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot feed this pet'))
      return
    }

    // Check if player has the food item
    const foodQuantity = InventoryService.getItemQuantity(player, 'food', foodType)

    if (foodQuantity <= 0) {
      console.log(`❌ ${player.name} doesn't have ${foodType} to feed pet`)
      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse(`You don't have any ${foodType}`))
      return
    }

    console.log(`🍔 [PetService] ${player.name} feeding pet ${petId} with ${foodType}`)

    // Use food from inventory
    InventoryService.useItem(player, 'food', foodType, 1)

    // Feed the pet (increase hunger)
    this.feedPet(pet, 25) // Food restores 25 hunger points

    // Send success response with updated stats
    client.send(
      MESSAGE_COLYSEUS.ACTION.RESPONSE,
      this.createSuccessResponse(
        {
          petStats: this.getPetStatsSummary(pet),
          inventory: InventoryService.getInventorySummary(player)
        },
        `Fed ${foodType} to your pet`
      )
    )

    // Also sync updated pets state to client
    console.log('🔄 Sending pets-state-sync after feed pet...')
    const playerPets = this.getPlayerPets(player)
    console.log(`📤 Syncing ${playerPets.length} pets with updated stats`)
    client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(playerPets))

    room.loggingService.logStateChange('PET_FED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      foodType,
      newHunger: pet.hunger,
      newHappiness: pet.happiness
    })

    console.log(`✅ ${player.name} fed pet ${petId}. New stats: hunger=${pet.hunger}, happiness=${pet.happiness}`)
  }

  private handlePlayWithPet(eventData: PetEventData) {
    const { sessionId, petId, room, client } = eventData
    const player = room.state.players.get(sessionId)
    if (!petId) {
      console.log(`❌ Play with pet failed - petId is undefined`)
      return
    }
    const pet = room.state.pets.get(petId)

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Play with pet failed - invalid player/pet or ownership`)
      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot play with this pet'))
      return
    }

    console.log(`🎾 [PetService] ${player.name} playing with pet ${petId}`)

    // Play with the pet (increase happiness)
    this.playWithPet(pet, 20)

    // Send success response with updated stats
    client.send(
      MESSAGE_COLYSEUS.ACTION.RESPONSE,
      this.createSuccessResponse(
        {
          petStats: this.getPetStatsSummary(pet)
        },
        'Played with your pet'
      )
    )

    // Also sync updated pets state to client
    const playerPets = this.getPlayerPets(player)
    client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(playerPets))

    room.loggingService.logStateChange('PET_PLAYED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      newHappiness: pet.happiness
    })

    console.log(`✅ ${player.name} played with pet ${petId}. New happiness: ${pet.happiness}`)
  }

  private handleCleanPet(eventData: PetEventData) {
    const { sessionId, petId, room, client } = eventData
    const player = room.state.players.get(sessionId)
    if (!petId) {
      console.log(`❌ Clean pet failed - petId is undefined`)
      return
    }
    const pet = room.state.pets.get(petId)

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Clean pet failed - invalid player/pet or ownership`)
      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot clean this pet'))
      return
    }

    console.log(`🧼 [PetService] ${player.name} cleaning pet ${petId}`)

    // Clean the pet (increase cleanliness)
    this.cleanPet(pet, 30)

    // Send success response with updated stats
    client.send(
      MESSAGE_COLYSEUS.ACTION.RESPONSE,
      this.createSuccessResponse(
        {
          petStats: this.getPetStatsSummary(pet)
        },
        'Cleaned your pet'
      )
    )

    // Also sync updated pets state to client
    const playerPets = this.getPlayerPets(player)
    client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(playerPets))

    room.loggingService.logStateChange('PET_CLEANED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      newCleanliness: pet.cleanliness,
      newHappiness: pet.happiness
    })

    console.log(
      `✅ ${player.name} cleaned pet ${petId}. New stats: cleanliness=${pet.cleanliness}, happiness=${pet.happiness}`
    )
  }

  private async handleEatedFood(eventData: PetEventData) {
    const { sessionId, petId, room, client, hungerLevel } = eventData
    try {
      const player = room.state.players.get(sessionId)
      if (!petId) {
        console.log(`❌ Eated food failed - petId is undefined`)
        return
      }
      const pet = room.state.pets.get(petId)

      // walletAddress is used as ownerId in Pet schema
      if (!player || !pet || pet.ownerId !== player.walletAddress) {
        console.log(`❌ Eated food failed - invalid player/pet or ownership`)
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot eated food'))
        return
      }

      // Check if pet hunger is allowed to eat
      if (Number(pet.hunger) > Number(GAME_CONFIG.PETS.HUNGER_ALLOW_EAT)) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot eated: pet hunger is full'))
        return
      }

      // Increase hunger level
      let hunger = +pet.hunger + Number(hungerLevel)
      if (hunger > 100) {
        hunger = 100
      }

      // Update colesyus state
      pet.hunger = hunger
      pet.lastUpdated = Date.now()

      // Update colesyus player pets collection
      if (player.pets && player.pets.has(petId)) {
        const playerPet = player.pets.get(petId)
        // TODO: Check if pet is active or no ????
        if (playerPet) {
          playerPet.hunger = hunger
          playerPet.lastUpdated = Date.now()
        }
      }

      // Update colesyus room state
      if (room.state.pets.has(petId)) {
        room.state.pets.set(petId, pet)
      }

      // Update DB
      // Use injected petModel directly

      const updatedPet = await this.petModel.findByIdAndUpdate(
        {
          _id: petId,
          status: PetStatus.Active
        },
        {
          $set: {
            'stats.hunger': hunger
          }
        }
      )

      if (!updatedPet) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.RESPONSE,
          this.createErrorResponse('Cannot eated: pet not found or not active')
        )
        return
      }

      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createSuccessResponse({}, 'Eated food'))

      return
    } catch (error) {
      console.error('❌ pet eated food error:', error)
      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('pet eated food error'))
    }
    return
  }

  private async handleCleanedPet(eventData: PetEventData) {
    const { sessionId, petId, room, client, cleaningItemId, poopId } = eventData

    try {
      // Validate inputs
      if (!petId || !cleaningItemId || !poopId) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse('Missing required parameters: petId, cleaningItemId, or poopId')
        )
        return
      }

      const player = room.state.players.get(sessionId)
      const pet = room.state.pets.get(petId)

      // Validate player and pet ownership
      if (!player || !pet || pet.ownerId !== player.walletAddress) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse('Cannot clean pet (invalid player or ownership)')
        )
        return
      }

      // Check if pet cleanliness is allowed to clean
      if (pet.cleanliness > GAME_CONFIG.PETS.CLEANLINESS_ALLOW_CLEAN) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse(
            `Pet is already clean (${pet.cleanliness}%). Clean when below ${GAME_CONFIG.PETS.CLEANLINESS_ALLOW_CLEAN}%`
          )
        )
        return
      }

      // Get cleanliness restore value
      const cleaningItem = await this.storeItemModel.findById(cleaningItemId)
      if (!cleaningItem) {
        console.log(`❌ Cleaning item ${cleaningItemId} not found in database`)
        client.send(MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE, this.createErrorResponse('Invalid cleaning item'))
        return
      }

      // Verify poop exists on pet
      const poopExists = pet.poops.some((poop) => poop.id === poopId)
      if (!poopExists) {
        console.log(`Poop ${poopId} not found on pet ${petId}`)
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse('Poop not found on this pet')
        )
        return
      }

      // Calculate new cleanliness level (cap at 100)
      const cleanlinessRestore = cleaningItem.effect.cleanliness ?? 0
      const newCleanliness = Math.min(pet.cleanliness + (cleanlinessRestore ?? 0), GAME_CONFIG.PETS.CLEANLINESS_MAX)

      // Update Colyseus state - Pet
      pet.cleanliness = newCleanliness
      pet.lastUpdateCleanliness = new Date().toISOString()
      pet.lastUpdated = Date.now()

      // Remove poop from pet's poops array
      pet.poops = pet.poops.filter((poop) => poop.id !== poopId)

      // Update Colyseus state - Player's pet reference
      if (player.pets && player.pets.has(petId)) {
        const playerPet = player.pets.get(petId)
        if (playerPet) {
          playerPet.cleanliness = newCleanliness
          playerPet.lastUpdateCleanliness = pet.lastUpdateCleanliness
          playerPet.lastUpdated = Date.now()
          playerPet.poops = playerPet.poops.filter((poop) => poop.id !== poopId)
        }
      }

      const price = cleaningItem.cost_nom

      // Check if player has enough tokens
      if (player.tokens < price) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse(`Not enough tokens. Need ${price}, have ${player.tokens}`)
        )
        return
      }

      // Deduct tokens from player state
      player.tokens -= price

      // Update database
      const result = await this.databaseService.withTransaction(async (session) => {
        const petModel = this.databaseService.getPetModel()
        const poopModel = this.databaseService.getPoopModel()
        const userModel = this.databaseService.getUserModel()

        const updatedPet = await petModel.findByIdAndUpdate(
          petId,
          {
            $set: {
              'stats.cleanliness': newCleanliness,
              'stats.last_update_cleanliness': new Date()
            },
            $pull: { poops: poopId }
          },
          { new: true, session }
        )

        const deletedPoop = await poopModel.findByIdAndDelete(poopId, { session })

        const updatedPlayer = await userModel.findOneAndUpdate(
          { wallet_address: player.walletAddress.toLowerCase() },
          { $inc: { token_nom: -price } },
          { new: true, session }
        )
        return { updatedPet, deletedPoop, updatedPlayer }
      })
      if (!result.updatedPet) {
        console.error(`❌ Failed to update pet ${petId} in database`)
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse('Failed to update pet in database')
        )
        return
      }

      if (!result.deletedPoop) {
        console.warn(`⚠️ Poop ${poopId} not found in database (already deleted?)`)
      }

      if (!result.updatedPlayer) {
        console.error(`❌ Failed to update player ${player.walletAddress} in database`)
        client.send(
          MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
          this.createErrorResponse('Failed to update player in database')
        )
        return
      }

      // Save inventory to database via event bus
      eventBus.emit('player.save_inventory', { player, walletAddress: player.walletAddress })

      console.log(
        `🧼 Pet ${petId} cleaned with ${cleaningItem.name}. Cleanliness: ${newCleanliness}% (+${cleanlinessRestore}%). Poop ${poopId} removed. Cost: ${price} tokens.`
      )

      client.send(
        MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
        this.createSuccessResponse(
          {
            petId,
            cleanliness: newCleanliness,
            cleanlinessRestored: cleanlinessRestore,
            itemUsed: cleaningItem.name,
            cost: price,
            remainingTokens: player.tokens,
            poopId
          },
          `Pet cleaned successfully! Cleanliness: ${newCleanliness}% (+${cleanlinessRestore}%). Cost: ${price} tokens`
        )
      )
    } catch (error) {
      console.error('❌ Pet cleaned error:', error)
      client.send(
        MESSAGE_COLYSEUS.ACTION.CLEANED_PET_RESPONSE,
        this.createErrorResponse('An error occurred while cleaning the pet')
      )
    }
  }

  private async handlePlayedPet(eventData: PetEventData) {
    const { sessionId, petId, room, client, happinessLevel } = eventData
    try {
      const player = room.state.players.get(sessionId)
      if (!petId) {
        console.log(`❌ Played pet failed - petId is undefined`)
        return
      }
      const pet = room.state.pets.get(petId)

      // walletAddress is used as ownerId in Pet schema
      if (!player || !pet || pet.ownerId !== player.walletAddress) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot play with pet'))
        return
      }

      // Check if pet is allowed to play
      if (Number(pet.happiness) > Number(GAME_CONFIG.PETS.HAPPINESS_ALLOW_PLAY)) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createErrorResponse('Cannot played: pet happiness is full'))
        return
      }

      // Increase happiness level
      let happiness = +pet.happiness + Number(happinessLevel)
      if (happiness > 100) {
        happiness = 100
      }

      // Update colesyus state
      pet.happiness = happiness
      pet.lastUpdated = Date.now()

      // Update colesyus player pets collection
      if (player.pets && player.pets.has(petId)) {
        // TODO: Check if pet is active or no ????
        const playerPet = player.pets.get(petId)
        if (playerPet) {
          playerPet.happiness = happiness
          playerPet.lastUpdated = Date.now()
        }
      }
      // Update colesyus room state
      if (room.state.pets.has(petId)) {
        room.state.pets.set(petId, pet)
      }

      // Cập nhật DB
      // Use injected petModel directly

      const updatedPet = await this.petModel.findByIdAndUpdate(
        {
          _id: petId,
          status: PetStatus.Active
        },
        {
          $set: {
            'stats.happiness': happiness
          }
        }
      )

      if (!updatedPet) {
        client.send(
          MESSAGE_COLYSEUS.ACTION.RESPONSE,
          this.createErrorResponse('Cannot played: pet not found or not active')
        )
        return
      }

      client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, this.createSuccessResponse({}, 'Played pet'))

      return
    } catch (error) {
      console.error('❌ Lỗi khi chơi với pet:', error)
      client.send(
        MESSAGE_COLYSEUS.ACTION.RESPONSE,
        this.createErrorResponse('Cannot played: pet not found or not active')
      )
    }
    return
  }

  private async handleCreatePoop(poopData: PoopEvenData) {
    const { sessionId, petId, positionX, positionY, room, client } = poopData
    try {
      const player = room.state.players.get(sessionId)
      if (!player || !petId) {
        console.log(`❌ Create poop failed - invalid player/pet`)
        return
      }

      const pet = room.state.pets.get(petId)

      if (!player || !pet || pet.ownerId !== player.walletAddress) {
        client.send(MESSAGE_COLYSEUS.ACTION.CREATE_POOP_RESPONSE, this.createErrorResponse('Cannot play with pet'))
        return
      }

      // TODO: Create poop in the room
      // Use injected poopModel directly

      const newPoop = new Poop()
      const petIdObject = new Types.ObjectId(petId)
      newPoop.pet_id = petIdObject
      newPoop.position_x = +positionX
      newPoop.position_y = +positionY

      // Save to DB
      const createdPoop = await this.poopModel.create(newPoop)
      await this.petModel.findByIdAndUpdate({ _id: petId }, { $push: { poops: createdPoop._id } })
      if (!createdPoop) {
        client.send(MESSAGE_COLYSEUS.ACTION.CREATE_POOP_RESPONSE, this.createErrorResponse('Cannot create poop'))
        return
      }
      
      const poopId = (createdPoop._id as Types.ObjectId).toString()
      // handle update pet state
      const gamePoop = new PetPoop()
      gamePoop.id = poopId
      gamePoop.positionX = +positionX
      gamePoop.positionY = +positionY

      pet.poops.push(gamePoop)

      client.send(
        MESSAGE_COLYSEUS.ACTION.CREATE_POOP_RESPONSE,
        this.createSuccessResponse(
          {
            poopId: createdPoop._id as string,
            petId: petId,
            positionX: +positionX,
            positionY: +positionY
          },
          'Created poop'
        )
      )
    } catch (error) {
      console.error('❌ Create poop error:', error)
      client.send(MESSAGE_COLYSEUS.ACTION.CREATE_POOP_RESPONSE, this.createErrorResponse('Cannot create poop'))
    }
  }

  // Core pet creation and management methods
  createStarterPet(ownerId: string): Pet {
    const starterPetId = `starter_${ownerId}_${Date.now()}`

    const pet = new Pet()
    pet.id = starterPetId
    pet.ownerId = ownerId
    pet.petType = GAME_CONFIG.PETS.DEFAULT_TYPE
    pet.hunger = 100 // Full hunger
    pet.happiness = 100 // Full happiness
    pet.cleanliness = 100 // Full cleanliness
    pet.lastUpdated = Date.now()

    return pet
  }

  createPet(petId: string, ownerId: string, petType?: string): Pet {
    const pet = new Pet()
    pet.id = petId
    pet.ownerId = ownerId
    pet.petType = petType || GAME_CONFIG.PETS.DEFAULT_TYPE
    pet.hunger = 100
    pet.happiness = 100
    pet.cleanliness = 100
    pet.lastUpdated = Date.now()

    return pet
  }

  // Update pet stats over time for a specific player (hunger, happiness, cleanliness decay)
  updatePlayerPetStats(player: Player): void {
    if (!player.pets) return

    const now = Date.now()
    const updateInterval = 60000 // 1 minute

    player.pets.forEach((pet: Pet) => {
      const timeSinceLastUpdate = now - pet.lastUpdated

      if (timeSinceLastUpdate >= updateInterval) {
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60)

        // Decay rates per hour
        const hungerDecay = 5 // Lose 5 hunger per hour
        const happinessDecay = 3 // Lose 3 happiness per hour
        const cleanlinessDecay = 2 // Lose 2 cleanliness per hour

        // Apply decay
        pet.hunger = Math.max(0, pet.hunger - hungerDecay * hoursElapsed)
        pet.happiness = Math.max(0, pet.happiness - happinessDecay * hoursElapsed)
        pet.cleanliness = Math.max(0, pet.cleanliness - cleanlinessDecay * hoursElapsed)

        pet.lastUpdated = now

        console.log(
          `📊 Pet ${pet.id} stats updated: hunger=${pet.hunger.toFixed(1)}, happiness=${pet.happiness.toFixed(1)}, cleanliness=${pet.cleanliness.toFixed(1)}`
        )
      }
    })
  }

  // Update pet stats over time for all pets in room (legacy method)
  updatePetStats(pets: MapSchema<Pet>): void {
    const now = Date.now()
    const updateInterval = 60000 // 1 minute

    pets.forEach((pet: Pet) => {
      const timeSinceLastUpdate = now - pet.lastUpdated

      if (timeSinceLastUpdate >= updateInterval) {
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60)

        // Decay rates per hour
        const hungerDecay = 5 // Lose 5 hunger per hour
        const happinessDecay = 3 // Lose 3 happiness per hour
        const cleanlinessDecay = 2 // Lose 2 cleanliness per hour

        // Apply decay
        pet.hunger = Math.max(0, pet.hunger - hungerDecay * hoursElapsed)
        pet.happiness = Math.max(0, pet.happiness - happinessDecay * hoursElapsed)
        pet.cleanliness = Math.max(0, pet.cleanliness - cleanlinessDecay * hoursElapsed)

        pet.lastUpdated = now

        console.log(
          `📊 Pet ${pet.id} stats updated: hunger=${pet.hunger.toFixed(1)}, happiness=${pet.happiness.toFixed(1)}, cleanliness=${pet.cleanliness.toFixed(1)}`
        )
      }
    })
  }

  // Feed pet to increase hunger and happiness
  feedPet(pet: Pet, foodValue: number = 20): void {
    pet.hunger = Math.min(100, pet.hunger + foodValue)
    pet.happiness = Math.min(100, pet.happiness + foodValue * 0.5) // Feeding also makes pet happy
    pet.lastUpdated = Date.now()

    console.log(`🍔 Pet ${pet.id} fed. Hunger: ${pet.hunger}, Happiness: ${pet.happiness}`)
  }

  // Play with pet to increase happiness
  playWithPet(pet: Pet, playValue: number = 15): void {
    pet.happiness = Math.min(100, pet.happiness + playValue)
    pet.lastUpdated = Date.now()

    console.log(`🎾 Played with pet ${pet.id}. Happiness: ${pet.happiness}`)
  }

  // Clean pet to increase cleanliness and happiness
  cleanPet(pet: Pet, cleanValue: number = 25): void {
    pet.cleanliness = Math.min(100, pet.cleanliness + cleanValue)
    pet.happiness = Math.min(100, pet.happiness + cleanValue * 0.3) // Cleaning makes pet slightly happy
    pet.lastUpdated = Date.now()

    console.log(`🧼 Pet ${pet.id} cleaned. Cleanliness: ${pet.cleanliness}, Happiness: ${pet.happiness}`)
  }

  // Get pets owned by specific player from player state
  getPlayerPets(player: Player): Pet[] {
    const playerPets: Pet[] = []
    if (player && player.pets) {
      player.pets.forEach((pet: Pet) => {
        playerPets.push(pet)
      })
    }
    return playerPets
  }

  // Get pet stats summary
  getPetStatsSummary(pet: Pet): GamePetStats {
    console.log('🐕 getPetStatsSummary', pet)
    return {
      id: pet.id,
      petType: pet.petType,
      hunger: Math.round(pet.hunger),
      happiness: Math.round(pet.happiness),
      cleanliness: Math.round(pet.cleanliness),
      overallHealth: Math.round((pet.hunger + pet.happiness + pet.cleanliness) / 3),
      lastUpdated: pet.lastUpdated,
      poops: pet.poops.map((poop) => {
        return {
          id: poop.id,
          petId: poop.petId,
          positionX: poop.positionX,
          positionY: poop.positionY
        }
      })
    }
  }

  // TODO: sync pets from database to player state
  syncPlayerPetsFromDatabase(player: Player, userPets: DBPet[]): void {
    console.log(`🔄 [PetService] Syncing ${userPets.length} pets from database for ${player.name}`)
    // Initialize player pets collection if not exists
    if (!player.pets) {
      player.pets = new MapSchema<Pet>()
    }

    // Clear existing pets
    player.pets.clear()

    // Add pets from database to player state
    userPets.forEach((dbPet: DBPet) => {
      const pet = new Pet()
      const gamePoops = (dbPet.poops ?? []).map((poop) => {
        const gamePoop = new PetPoop()
        gamePoop.id = poop._id.toString()
        gamePoop.petId = dbPet._id.toString()
        gamePoop.positionX = poop.position_x != null ? +poop.position_x : 0
        gamePoop.positionY = poop.position_y != null ? +poop.position_y : 0
        return gamePoop
      })
      pet.id = dbPet._id.toString()
      pet.ownerId = player.sessionId
      pet.petType = dbPet.type?.name || 'chog'
      pet.hunger = dbPet.stats?.hunger ?? 50
      pet.happiness = dbPet.stats?.happiness ?? 50
      pet.cleanliness = dbPet.stats?.cleanliness ?? 50
      pet.lastUpdateHappiness = dbPet.stats?.last_update_happiness?.toISOString() ?? ''
      pet.lastUpdateHunger = dbPet.stats?.last_update_hunger?.toISOString() ?? ''
      pet.lastUpdateCleanliness = dbPet.stats?.last_update_cleanliness?.toISOString() ?? ''
      pet.isAdult = dbPet.isAdult ?? false
      pet.birthTime = dbPet.createdAt?.toISOString() ?? ''
      pet.growthDuration = dbPet.type.time_natural || 0
      pet.incomeCycleTime = dbPet.token_income || 0
      pet.incomePerCycle = dbPet.type.max_income_per_claim || 0
      pet.lastClaim = dbPet.last_claim?.toISOString() ?? ''
      pet.poops = gamePoops
      pet.lastUpdated = Date.now()
      player.pets.set(pet.id, pet)
    })
    console.log('🐕 player.pets', JSON.stringify(player.pets, null, 2))

    // Update player's pet count
    player.totalPetsOwned = this.getPlayerPets(player).length

    console.log(`✅ [PetService] Synced ${player.totalPetsOwned} pets for ${player.name}`)
  }
}
