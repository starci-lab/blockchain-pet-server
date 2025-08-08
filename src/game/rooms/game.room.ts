import { Room, Client } from 'colyseus'
import { GameRoomState, Player, Pet } from '../schemas/game-room.schema'
import { MapSchema } from '@colyseus/schema'
// Emitters: Only emit events, no business logic

// Services: Handle events with business logic
import { ResponseBuilder } from '../utils/ResponseBuilder'
import { GAME_CONFIG } from '../config/GameConfig'
import { PetEmitters } from 'src/game/emitter/PetEmitters'
import { FoodEmitters } from 'src/game/emitter/FoodEmitters'
import { PlayerEmitter } from 'src/game/emitter/player'
import { LoggingService } from 'src/game/handlers/LoggingService'
import { PlayerService } from 'src/game/handlers/PlayerService'
import { PetService } from 'src/game/handlers/PetService'
import { RoomOptions } from '../types/RoomTypes'
import { GamePlayer } from '../types/GameTypes'
import { MESSAGE_COLYSEUS } from '../constants/message-colyseus'

export class GameRoom extends Room<GameRoomState> {
  maxClients = GAME_CONFIG.ROOM.MAX_CLIENTS // Single player only
  public loggingService: LoggingService
  private lastPlayerSave: number = 0

  onCreate(options: RoomOptions) {
    this.loggingService = new LoggingService(this)
    this.initializeRoom(options)
    this.setupMessageHandlers()
    this.startGameLoop()
  }

  private initializeRoom(options: RoomOptions) {
    // Initialize room state using setState
    this.setState(new GameRoomState())
    this.state.roomName = options?.name || 'Pet Simulator Room'

    // console.log('🎧 Initializing service event listeners...');
    // PlayerService.initializeEventListeners();
    // PetService.initializeEventListeners();
    // InventoryService.initializeEventListeners();
    // console.log('✅ All service event listeners initialized');

    this.loggingService.logRoomCreated()
  }

  private startGameLoop() {
    // Initialize game timer for hunger decrease
    this.setSimulationInterval(() => {
      this.updateGameLogic()
    }, GAME_CONFIG.ROOM.UPDATE_INTERVAL)

    console.log('✅ Pet Simulator Room initialized successfully')
  }

  private setupMessageHandlers() {
    // Pet emitters (emit events to PetService)
    this.onMessage(MESSAGE_COLYSEUS.PET.BUY_PET, PetEmitters.buyPet(this))
    this.onMessage(MESSAGE_COLYSEUS.PET.REMOVE_PET, PetEmitters.removePet(this))
    this.onMessage(MESSAGE_COLYSEUS.PET.FEED_PET, PetEmitters.feedPet(this))
    this.onMessage(MESSAGE_COLYSEUS.PET.PLAY_WITH_PET, PetEmitters.playWithPet(this))
    this.onMessage(MESSAGE_COLYSEUS.PET.EATED_FOOD, PetEmitters.eatedFood(this))
    this.onMessage(MESSAGE_COLYSEUS.PET.CLEANED_PET, PetEmitters.cleanedPet(this))
    this.onMessage(MESSAGE_COLYSEUS.PET.PLAYED_PET, PetEmitters.playedPet(this))

    // Food emitters (emit events to InventoryService)
    this.onMessage(MESSAGE_COLYSEUS.PET.BUY_FOOD, FoodEmitters.purchaseItem(this))
    this.onMessage('get_store_catalog', FoodEmitters.getStoreCatalog(this))
    this.onMessage('get_inventory', FoodEmitters.getInventory(this))

    // Player emitters (emit events to PlayerService)
    this.onMessage('request_game_config', PlayerEmitter.requestGameConfig(this))
    this.onMessage('request_player_state', PlayerEmitter.requestPlayerState(this))
    this.onMessage('request_pets_state', PlayerEmitter.requestPetsState(this))
    this.onMessage('get_profile', PlayerEmitter.getProfile(this))
    this.onMessage('claim_daily_reward', PlayerEmitter.claimDailyReward(this))
    this.onMessage('update_settings', PlayerEmitter.updateSettings(this))
    this.onMessage('update_tutorial', PlayerEmitter.updateTutorial(this))

    console.log('✅ Message emitters setup complete (event emitter pattern)')
  }

  private updateGameLogic() {
    // Update pet stats over time for each player (hunger, happiness, cleanliness decay)
    this.state.players.forEach((player) => {
      PetService.updatePlayerPetStats(player)
    })

    // Periodically save player data (every 5 minutes)
    const now = Date.now()
    if (!this.lastPlayerSave || now - this.lastPlayerSave >= 5 * 60 * 1000) {
      this.saveAllPlayerData().catch((error) => {
        console.error('❌ Failed to save player data:', error)
      })
      this.lastPlayerSave = now
    }

    // Log periodic state summary
    this.loggingService.periodicStateSummary()
  }

  private async saveAllPlayerData() {
    let savedCount = 0
    const savePromises: Promise<void>[] = []

    this.state.players.forEach((player) => {
      savePromises.push(PlayerService.savePlayerData(player))
      savedCount++
    })

    try {
      await Promise.all(savePromises)
      if (savedCount > 0) {
        console.log(`💾 Auto-saved data for ${savedCount} players`)
      }
    } catch (error) {
      console.error(`❌ Error saving player data:`, error)
    }
  }

  async onJoin(client: Client, options: RoomOptions) {
    console.log(`👋 Player joined: ${client.sessionId} wallet:`, options)

    try {
      // Create new player using async service to fetch real user data
      const player = await PlayerService.createNewPlayer({
        sessionId: client.sessionId,
        name: options?.name,
        addressWallet: options?.addressWallet || ''
      })
      console.log(`🎮 Player created: ${player.name} (${client.sessionId}) ${player.walletAddress}`)

      // Add to room state
      this.state.players.set(client.sessionId, player)
      this.state.playerCount = this.state.players.size

      await this.handleNewPlayerPets(client, player)
      this.loggingService.logPlayerJoined(player as GamePlayer)
      this.sendWelcomeMessage(client, player)

      console.log(`✅ ${player.name} joined successfully. Total players: ${this.state.playerCount}`)
    } catch (error) {
      console.error(`❌ Failed to create player for ${client.sessionId}:`, error)

      // Create fallback player with minimal data
      const fallbackPlayer = new Player()
      fallbackPlayer.sessionId = client.sessionId
      fallbackPlayer.name = options?.name || `Player_${client.sessionId.substring(0, 6)}`
      fallbackPlayer.tokens = GAME_CONFIG.ECONOMY.INITIAL_TOKENS
      fallbackPlayer.totalPetsOwned = 0

      this.state.players.set(client.sessionId, fallbackPlayer)
      this.state.playerCount = this.state.players.size

      await this.handleNewPlayerPets(client, fallbackPlayer)
      this.sendWelcomeMessage(client, fallbackPlayer)

      console.log(`⚠️ Created fallback player for ${client.sessionId}`)
    }
  }

  private async handleNewPlayerPets(client: Client, player: Player) {
    console.log('🐾 Handling new player pets for:', player.name)
    try {
      const petsFromDb = await PetService.fetchPetsFromDatabase(player.walletAddress)
      console.log(`🐾 Found ${petsFromDb.length} pets for ${player.name} in DB`)
      if (!player.pets) {
        player.pets = new MapSchema<Pet>()
      } else {
        player.pets.clear()
      }
      // Chỉ đồng bộ danh sách pet từ DB
      petsFromDb.forEach((pet: Pet) => {
        this.state.pets.set(pet.id, pet)
        player.pets.set(pet.id, pet)
      })
      player.totalPetsOwned = petsFromDb.length
      client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(petsFromDb))
      console.log(`📤 Synced ${petsFromDb.length} pets from DB for ${player.name}`)
    } catch (err) {
      console.error(`❌ Failed to sync pets from DB for ${player.name}:`, err)
      client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync([]))
    }
  }

  private sendWelcomeMessage(client: Client, player: Player) {
    // Send welcome message
    client.send('welcome', ResponseBuilder.welcomeMessage(player.name, this.roomId, this.state.roomName))
  }

  onLeave(client: Client, consented?: boolean) {
    console.log(`👋 Player left: ${client.sessionId}, consented: ${consented}`)
    this.allowReconnection(client, GAME_CONFIG.ROOM.RECONNECTION_TIME)

    const player = this.state.players.get(client.sessionId) as GamePlayer
    if (player) {
      // Save player data before removing
      PlayerService.savePlayerData(player).catch((error) => {
        console.error(`❌ Failed to save player data on leave:`, error)
      })

      // Remove all pets owned by this player
      const petIdsToRemove = this.removePlayerPets(client.sessionId, player.name)

      // Remove player immediately (no reconnection for simplicity)
      this.state.players.delete(client.sessionId)
      this.state.playerCount = this.state.players.size

      this.loggingService.logPlayerLeft(player, petIdsToRemove.length, consented)

      console.log(
        `🗑️ ${player.name} removed with ${petIdsToRemove.length} pets. Remaining players: ${this.state.playerCount}`
      )
    }
  }

  private removePlayerPets(sessionId: string, playerName: string): string[] {
    const petIdsToRemove: string[] = []

    this.state.pets.forEach((pet, petId) => {
      if (pet.ownerId === sessionId) {
        petIdsToRemove.push(petId)
      }
    })

    // Remove pets and log removal
    petIdsToRemove.forEach((petId) => {
      this.state.pets.delete(petId)

      this.loggingService.logStateChange('PET_REMOVED', {
        petId,
        ownerId: sessionId,
        ownerName: playerName,
        reason: 'owner_left'
      })

      console.log(`🗑️ Pet ${petId} removed (owner ${playerName} left)`)
    })

    return petIdsToRemove
  }

  onDispose() {
    this.loggingService.logRoomDisposed()
  }
}
