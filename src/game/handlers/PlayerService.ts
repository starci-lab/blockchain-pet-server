import { Player, InventoryItem } from '../schemas/game-room.schema'
import { GAME_CONFIG } from '../config/GameConfig'
import { eventBus } from 'src/shared/even-bus'
import { PetService } from './PetService'
import { InventoryService } from './InventoryService'
import { DatabaseService } from '../services/DatabaseService'
import { Types } from 'mongoose'
import { DBPet } from '../types/GameTypes'
import { MESSAGE_COLYSEUS } from '../constants/message-colyseus'

interface DatabaseUser {
  _id: Types.ObjectId
  wallet_address: string
  token_nom?: number
  last_active_at?: Date
  createdAt?: Date
}

interface DatabasePet {
  _id: Types.ObjectId
  name?: string
  type?: {
    name?: string
  }
  stats?: {
    happiness?: number
    hunger?: number
    cleanliness?: number
    last_update_happiness?: Date
    last_update_hunger?: Date
    last_update_cleanliness?: Date
  }
  status?: string
  createdAt?: Date
  updatedAt?: Date
}

interface UserData {
  sessionId: string
  name?: string
  tokens?: number
  totalPetsOwned?: number
  inventory?: InventoryItemData[]
  wallet_address?: string
}

interface InventoryItemData {
  itemType: string
  itemName: string
  quantity?: number
  totalPurchased?: number
}

interface PetState {
  id: string
  ownerId: string
  petType: string
  hunger: number
  happiness: number
  cleanliness: number
  lastUpdated: Date
  lastUpdateHappiness?: Date
  lastUpdateHunger?: Date
  lastUpdateCleanliness?: Date
  isAdult?: boolean
  tokenIncome?: number
  totalIncome?: number
  lastClaim?: Date
}

interface RoomState {
  players: Map<string, Player>
  pets?: Map<string, PetState>
}

interface GameRoom {
  state: RoomState
  loggingService?: {
    logStateChange: (action: string, data: Record<string, unknown>) => void
  }
}

interface GameClient {
  send: (type: string, data: Record<string, unknown>) => void
}

interface EventData {
  sessionId: string
  room: GameRoom
  client: GameClient
  settings?: Record<string, unknown>
  tutorialData?: Record<string, unknown>
}

export class PlayerService {
  // Initialize event listeners for player actions
  static initializeEventListeners() {
    console.log('🎧 Initializing PlayerService event listeners...')

    // Listen for player events
    eventBus.on('player.get_game_config', this.handleGetGameConfig.bind(this))
    eventBus.on('player.get_state', this.handleGetPlayerState.bind(this))
    eventBus.on('player.get_profile', (eventData: EventData) => {
      void this.handleGetProfile(eventData)
    })
    eventBus.on('player.get_pets_state', this.handleGetPetsState.bind(this))
    eventBus.on('player.claim_daily_reward', (eventData: EventData) => {
      void this.handleClaimDailyReward(eventData)
    })
    eventBus.on('player.update_settings', this.handleUpdateSettings.bind(this))
    eventBus.on('player.update_tutorial', this.handleUpdateTutorial.bind(this))

    console.log('✅ PlayerService event listeners initialized')
  }

  // Event handlers
  static handleGetGameConfig(eventData: EventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('game-config-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    console.log(`⚙️ [Service] Sending game config to ${player.name}`)

    client.send('game-config-response', {
      success: true,
      config: {
        version: '1.0.0',
        maxPets: 5, // Default max pets per player
        updateInterval: GAME_CONFIG.ROOM.UPDATE_INTERVAL,
        economy: {
          initialTokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
          starterFoodQuantity: GAME_CONFIG.ECONOMY.STARTER_FOOD_QUANTITY
        },
        pets: {
          defaultType: GAME_CONFIG.PETS.DEFAULT_TYPE,
          hungerDecayRate: 5,
          happinessDecayRate: 3,
          cleanlinessDecayRate: 2
        }
      }
    })
  }

  static handleGetPlayerState(eventData: EventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('player-state-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    console.log(`👤 [Service] Sending player state to ${player.name}`)

    // Get player's pets from player state
    const playerPets = PetService.getPlayerPets(player)
    const inventorySummary = InventoryService.getInventorySummary(player)

    client.send('player-state-response', {
      success: true,
      player: {
        sessionId: player.sessionId,
        name: player.name,
        tokens: player.tokens,
        totalPetsOwned: player.totalPetsOwned,
        inventory: inventorySummary
      },
      pets: playerPets.map((pet) => PetService.getPetStatsSummary(pet))
    })
  }

  static async handleGetProfile(eventData: EventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('profile-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    console.log(`📋 [Service] Fetching profile from DB for ${player.name}`)

    try {
      // Get database service instance
      const dbService = DatabaseService.getInstance()
      if (!dbService) {
        throw new Error('Database service not initialized')
      }

      const userModel = dbService.getUserModel()
      const petModel = dbService.getPetModel()

      // Try to get wallet address from player first, fallback to session
      let walletAddress = player.walletAddress
      if (!walletAddress) {
        const sessionWallet = this.getWalletFromSession(sessionId)
        if (sessionWallet) {
          walletAddress = sessionWallet
        }
      }

      let user = null

      if (walletAddress) {
        // Find user by wallet address
        user = (await userModel
          .findOne({
            wallet_address: walletAddress.toLowerCase()
          })
          .exec()) as DatabaseUser | null
      }

      if (!user) {
        // If no user found in DB, use in-memory player data
        console.log(`⚠️ User not found in DB, using in-memory data for ${player.name}`)

        const inventorySummary = InventoryService.getInventorySummary(player)

        client.send('profile-response', {
          success: true,
          profile: {
            sessionId: player.sessionId,
            name: player.name,
            wallet_address: walletAddress,
            tokens: player.tokens,
            totalPetsOwned: player.totalPetsOwned,
            inventory: inventorySummary,
            pets: [],
            joinedAt: Date.now(),
            lastActiveAt: new Date()
          }
        })
        return
      }

      // Fetch user's pets from database
      const userPets = (await petModel.find({ owner_id: user._id }).populate('type').exec()) as DatabasePet[]

      console.log(`🐕 Found ${userPets.length} pets for user ${user.wallet_address}`)

      // Sync pets from database to player state
      PetService.syncPlayerPetsFromDatabase(player, userPets as DBPet[])

      // Convert user data to profile response
      const profile = {
        sessionId: player.sessionId,
        name: player.name || `Player_${user.wallet_address.substring(0, 6)}`,
        wallet_address: user.wallet_address,
        tokens: player.tokens, // Use in-game tokens (might be different from DB)
        totalPetsOwned: player.totalPetsOwned, // Now accurate from synced pets
        inventory: this.convertDbInventoryToGameFormat([]),
        pets: userPets.map((pet: DatabasePet) => ({
          id: pet._id.toString(),
          name: pet.name || 'Unnamed Pet',
          type: pet.type?.name || 'chog',
          stats: {
            happiness: pet.stats?.happiness || 0,
            hunger: pet.stats?.hunger || 0,
            cleanliness: pet.stats?.cleanliness || 0,
            last_update_happiness: pet.stats?.last_update_happiness || new Date(),
            last_update_hunger: pet.stats?.last_update_hunger || new Date(),
            last_update_cleanliness: pet.stats?.last_update_cleanliness || new Date()
          },
          status: pet.status || 'idle',
          createdAt: pet.createdAt || new Date(),
          updatedAt: pet.updatedAt || new Date()
        })),
        joinedAt: user.createdAt ? user.createdAt.getTime() : Date.now(),
        lastActiveAt: user.last_active_at || new Date()
      }

      client.send('profile-response', {
        success: true,
        profile: profile
      })

      console.log(`✅ Profile sent to ${player.name} with ${userPets.length} pets`)
    } catch (error) {
      console.error(`❌ Error fetching profile from DB for ${player.name}:`, error)

      // Fallback to in-memory data if DB query fails
      const inventorySummary = InventoryService.getInventorySummary(player) // Get wallet address for fallback profile
      let fallbackWallet = player.walletAddress
      if (!fallbackWallet) {
        const sessionWallet = this.getWalletFromSession(sessionId)
        if (sessionWallet) {
          fallbackWallet = sessionWallet
        }
      }

      client.send('profile-response', {
        success: true,
        profile: {
          sessionId: player.sessionId,
          name: player.name,
          wallet_address: fallbackWallet,
          tokens: player.tokens,
          totalPetsOwned: player.totalPetsOwned,
          inventory: inventorySummary,
          pets: [],
          joinedAt: Date.now(),
          lastActiveAt: new Date(),
          error: 'Database temporarily unavailable'
        }
      })
    }
  }

  static async handleClaimDailyReward(eventData: EventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('daily-reward-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    console.log(`🎁 [Service] Processing daily reward for ${player.name}`)

    // Simple daily reward logic (could be enhanced with actual date checking)
    const rewardTokens = 50
    const rewardFood = 2

    // Add tokens
    await this.addTokens(player, rewardTokens)

    // Add food items
    InventoryService.addItem(player, 'food', 'apple', 'apple', rewardFood)

    client.send('daily-reward-response', {
      success: true,
      message: 'Daily reward claimed!',
      rewards: {
        tokens: rewardTokens,
        items: [{ type: 'food', name: 'apple', quantity: rewardFood }]
      },
      newTokenBalance: player.tokens
    })

    room.loggingService?.logStateChange('DAILY_REWARD_CLAIMED', {
      playerId: sessionId,
      playerName: player.name,
      tokensRewarded: rewardTokens,
      itemsRewarded: [{ type: 'food', name: 'apple', quantity: rewardFood }]
    })
  }

  static handleUpdateSettings(eventData: EventData) {
    const { sessionId, settings, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('settings-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    console.log(`⚙️ [Service] Updating settings for ${player.name}:`, settings)

    // In a real implementation, you'd store settings in player schema or database
    // For now, just acknowledge the update
    client.send('settings-response', {
      success: true,
      message: 'Settings updated successfully',
      settings: settings as Record<string, unknown>
    })

    room.loggingService?.logStateChange('SETTINGS_UPDATED', {
      playerId: sessionId,
      playerName: player.name,
      settings: settings as Record<string, unknown>
    })
  }

  static handleUpdateTutorial(eventData: EventData) {
    const { sessionId, tutorialData, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('tutorial-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    console.log(`📚 [Service] Updating tutorial for ${player.name}:`, tutorialData)

    // In a real implementation, you'd store tutorial progress in player schema or database
    client.send('tutorial-response', {
      success: true,
      message: 'Tutorial progress updated',
      tutorialData: tutorialData as Record<string, unknown>
    })

    room.loggingService?.logStateChange('TUTORIAL_UPDATED', {
      playerId: sessionId,
      playerName: player.name,
      tutorialData: tutorialData as Record<string, unknown>
    })
  }
  // Fetch user data from MongoDB via Mongoose
  static async fetchUserData(sessionId: string, addressWallet?: string): Promise<UserData> {
    try {
      console.log(`🔍 Fetching user data for sessionId: ${sessionId}, wallet: ${addressWallet}`)

      // Get database service instance
      const dbService = DatabaseService.getInstance()
      if (!dbService) {
        console.warn('Database service not initialized, using defaults')
        return this.getDefaultUserData(sessionId)
      }

      const userModel = dbService.getUserModel()
      const petModel = dbService.getPetModel()

      // Try to find user by wallet address or session
      let user: DatabaseUser | null = null

      if (addressWallet) {
        user = (await userModel
          .findOne({
            wallet_address: addressWallet.toLowerCase()
          })
          .exec()) as DatabaseUser | null
      }

      if (user) {
        console.log(`✅ User data fetched from DB:`, user.wallet_address)
        console.log(user)
        // console.log(`🐕 User has ${user.pets?.length || 0} pets in DB`);
        const petCount = await petModel.countDocuments({ owner_id: user._id }).exec()

        return {
          sessionId,
          name: `Player_${user.wallet_address.substring(0, 6)}`,
          tokens: user.token_nom || GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
          totalPetsOwned: petCount, // Use actual count from database
          inventory: [], // User schema doesn't have inventory yet
          wallet_address: user.wallet_address
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch user data from DB, using defaults:`, error)
      return this.getDefaultUserData(sessionId)
    }

    return this.getDefaultUserData(sessionId)
  }

  private static getDefaultUserData(sessionId: string): UserData {
    return {
      sessionId,
      name: `Player_${sessionId.substring(0, 6)}`,
      tokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
      totalPetsOwned: 0,
      inventory: []
    }
  }

  static async createNewPlayer({
    sessionId,
    name,
    addressWallet
  }: {
    sessionId: string
    name?: string
    addressWallet?: string
  }): Promise<Player> {
    const userData = await this.fetchUserData(sessionId, addressWallet)
    console.log('User data fetched:', userData)

    const player = new Player()
    player.sessionId = sessionId
    player.name = userData.name || name || `Player_${sessionId.substring(0, 6)}`
    player.tokens = userData.tokens || GAME_CONFIG.ECONOMY.INITIAL_TOKENS
    player.totalPetsOwned = userData.totalPetsOwned || 0
    player.walletAddress = userData.wallet_address || addressWallet || ''

    // Add inventory from fetched data or starter items
    if (userData.inventory && userData.inventory.length > 0) {
      // Load existing inventory from database
      userData.inventory.forEach((item: InventoryItemData) => {
        const inventoryItem = new InventoryItem()
        inventoryItem.itemType = item.itemType
        inventoryItem.itemName = item.itemName
        inventoryItem.quantity = item.quantity || 0
        inventoryItem.totalPurchased = item.totalPurchased || 0
        player.inventory.set(`${item.itemType}_${item.itemName}`, inventoryItem)
      })
      console.log(`📦 Loaded ${userData.inventory.length} inventory items from database`)
    } else {
      // Add starter items for new user
      const starterApple = new InventoryItem()
      starterApple.itemType = 'food'
      starterApple.itemName = 'apple'
      starterApple.quantity = GAME_CONFIG.ECONOMY.STARTER_FOOD_QUANTITY || 3
      starterApple.totalPurchased = starterApple.quantity
      player.inventory.set('food_apple', starterApple)
      console.log(`🎁 Added starter items for new user`)
    }

    // Sync pets from database if user exists
    if (addressWallet) {
      try {
        console.log(`🔍 [DEBUG] Attempting to sync pets for wallet: ${addressWallet}`)
        await this.syncPlayerPetsFromDatabase(player, addressWallet)
        console.log(`🔄 [DEBUG] Pet sync completed for ${player.name}, totalPets: ${player.totalPetsOwned}`)
      } catch (error) {
        console.warn(`⚠️ Failed to sync pets from database:`, error)
      }
    } else {
      console.log(`👤 [DEBUG] No wallet address provided, skipping pet sync`)
    }

    console.log(
      `👤 Created player: ${player.name} with ${player.tokens} tokens, ${player.totalPetsOwned} pets, ${player.inventory.size} inventory items`
    )

    // Emit event to track user login
    eventBus.emit('user.login', {
      sessionId,
      addressWallet,
      name: player.name,
      tokens: player.tokens,
      timestamp: Date.now()
    })

    return player
  }

  // Sync pets from database to player state during player creation
  static async syncPlayerPetsFromDatabase(player: Player, walletAddress: string): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance()
      if (!dbService) {
        console.warn('Database service not initialized, skipping pet sync')
        return
      }

      const userModel = dbService.getUserModel()
      const petModel = dbService.getPetModel()

      // Find user by wallet address
      const user = (await userModel
        .findOne({
          wallet_address: walletAddress.toLowerCase()
        })
        .exec()) as DatabaseUser | null

      if (!user) {
        console.log(`👤 New user ${walletAddress}, no pets to sync`)
        return
      }

      // Fetch user's pets from database
      const userPets = (await petModel.find({ owner_id: user._id }).populate('type').exec()) as DatabasePet[]

      if (userPets.length > 0) {
        // Use PetService to sync pets to player state
        PetService.syncPlayerPetsFromDatabase(player, userPets as DBPet[])
        console.log(`🔄 Synced ${userPets.length} pets from database for ${player.name}`)
      }
    } catch (error) {
      console.error(`❌ Error syncing pets from database:`, error)
    }
  }

  // Token management methods with database synchronization
  static async addTokens(player: Player, amount: number): Promise<void> {
    player.tokens += amount
    console.log(`💰 Added ${amount} tokens to ${player.name}. New balance: ${player.tokens}`)

    // Save to database immediately
    await this.saveTokensToDatabase(player, 'add', amount)
  }

  static async deductTokens(player: Player, amount: number): Promise<boolean> {
    if (player.tokens < amount) {
      console.log(`❌ ${player.name} doesn't have enough tokens. Has: ${player.tokens}, needs: ${amount}`)
      return false
    }

    player.tokens -= amount
    console.log(`💰 Deducted ${amount} tokens from ${player.name}. New balance: ${player.tokens}`)

    // Save to database immediately
    await this.saveTokensToDatabase(player, 'deduct', amount)
    return true
  }

  // Helper method to save tokens to database
  static async saveTokensToDatabase(player: Player, action: string, amount: number): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance()
      if (!dbService) {
        console.warn('Database service not initialized, skipping token save')
        return
      }

      // Use player.walletAddress first, fallback to getWalletFromSession
      let walletAddress = player.walletAddress
      if (!walletAddress) {
        const sessionWallet = this.getWalletFromSession(player.sessionId)
        if (sessionWallet) {
          walletAddress = sessionWallet
        }
      }

      if (!walletAddress) {
        console.warn(
          `No wallet address found for player ${player.name} (session: ${player.sessionId}), skipping token save`
        )
        return
      }

      const userModel = dbService.getUserModel()

      // Update user with new token balance and activity timestamp
      const updateResult = await userModel
        .findOneAndUpdate(
          { wallet_address: walletAddress.toLowerCase() },
          {
            token_nom: player.tokens,
            last_active_at: new Date()
          },
          { upsert: false, new: true }
        )
        .exec()

      if (updateResult) {
        console.log(
          `💾 Tokens ${action}ed: ${amount}. Saved ${player.tokens} tokens to DB for ${player.name} (wallet: ${walletAddress})`
        )
      } else {
        console.warn(`⚠️ User not found in DB for wallet ${walletAddress}, tokens not saved`)
      }
    } catch (error) {
      console.error(`❌ Failed to save tokens to DB for ${player.name}:`, error)
    }
  }

  // Helper method to get session-wallet mapping
  private static getWalletFromSession(sessionId: string): string | null {
    // TODO: Implement proper session-wallet mapping from JWT token or cache
    // Options:
    // 1. Parse JWT token to extract wallet address
    // 2. Store session->wallet mapping in Redis/memory cache during auth
    // 3. Use dedicated session storage service

    // For now, try different patterns to extract wallet address
    // Pattern 1: sessionId is already a wallet address (0x...)
    if (sessionId.startsWith('0x') && sessionId.length === 42) {
      return sessionId
    }

    // Pattern 2: sessionId contains wallet in some format
    // Add more patterns as needed based on your auth implementation

    console.warn(
      `⚠️ Could not extract wallet address from sessionId: ${sessionId}. ` +
        `Consider implementing proper session-wallet mapping.`
    )
    return null
  }

  static handleGetPetsState(eventData: EventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, {
        success: false,
        message: 'Player not found',
        pets: []
      })
      return
    }

    console.log(`🐕 [Service] Sending pets state to ${player.name}`)

    try {
      // Get player's pets from room state
      const roomPets: PetState[] = []
      if (room.state.pets) {
        room.state.pets.forEach((pet: PetState) => {
          if (pet.ownerId === sessionId) {
            roomPets.push(pet)
          }
        })
      }

      // Also get pets from player state as fallback
      const playerPets = PetService.getPlayerPets(player)

      // Use room pets as primary source, fallback to player pets
      const allPets = roomPets.length > 0 ? roomPets : playerPets

      console.log(
        `📊 Found ${allPets.length} pets for ${player.name} (${roomPets.length} from room, ${playerPets.length} from player)`
      )

      // Send pets state sync
      client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, {
        success: true,
        pets: allPets.map((pet) => this.convertPetToStateFormat(pet)),
        totalPets: allPets.length
      })

      console.log(`✅ Pets state sent to ${player.name}: ${allPets.length} pets`)
    } catch (error: unknown) {
      console.error(`❌ Error getting pets state for ${player.name}:`, error)

      client.send(MESSAGE_COLYSEUS.PET.STATE_SYNC, {
        success: false,
        message: 'Failed to get pets state',
        pets: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Helper method to convert DB inventory format to game format
  private static convertDbInventoryToGameFormat(dbInventory: InventoryItemData[]): Record<string, unknown> {
    const gameInventory: Record<string, unknown> = {}

    dbInventory.forEach((item) => {
      const key = `${item.itemType}_${item.itemName}`
      gameInventory[key] = {
        itemType: item.itemType,
        itemName: item.itemName,
        quantity: item.quantity || 0,
        totalPurchased: item.totalPurchased || 0
      }
    })

    return gameInventory
  }

  // Helper method to convert pet to state format
  private static convertPetToStateFormat(pet: any): Record<string, unknown> {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      id: pet.id as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ownerId: pet.ownerId as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      petType: pet.petType as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      hunger: (pet.hunger as number) || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      happiness: (pet.happiness as number) || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      cleanliness: (pet.cleanliness as number) || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      lastUpdated: pet.lastUpdated || new Date(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      lastUpdateHappiness: pet.lastUpdateHappiness,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      lastUpdateHunger: pet.lastUpdateHunger,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      lastUpdateCleanliness: pet.lastUpdateCleanliness,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      isAdult: pet.isAdult,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      tokenIncome: pet.tokenIncome,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      totalIncome: pet.totalIncome,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      lastClaim: pet.lastClaim
    }
  }

  // Save player data to database
  static async savePlayerData(player: Player): Promise<void> {
    try {
      console.log(`💾 Saving player data for ${player.name}...`)

      const dbService = DatabaseService.getInstance()
      if (!dbService) {
        console.warn('Database service not initialized, skipping player save')
        return
      }

      // Use player.walletAddress first, fallback to getWalletFromSession
      let walletAddress = player.walletAddress
      if (!walletAddress) {
        const sessionWallet = this.getWalletFromSession(player.sessionId)
        if (sessionWallet) {
          walletAddress = sessionWallet
        }
      }

      if (!walletAddress) {
        console.warn(`No wallet address found for player ${player.name} (session: ${player.sessionId}), skipping save`)
        return
      }

      const userModel = dbService.getUserModel()

      // Update user activity and tokens
      await userModel
        .findOneAndUpdate(
          { wallet_address: walletAddress.toLowerCase() },
          {
            last_active_at: new Date(),
            token_nom: player.tokens // Sync tokens to database
          },
          { upsert: false }
        )
        .exec()

      console.log(`✅ Player data saved for ${player.name} (wallet: ${walletAddress}, tokens: ${player.tokens})`)
    } catch (error) {
      console.error(`❌ Failed to save player data for ${player.name}:`, error)
    }
  }

  static async hasEnoughTokens(player: Player, amount: number): Promise<boolean> {
    try {
      const dbService = DatabaseService.getInstance()

      const userModel = dbService.getUserModel()
      const user = await userModel.findOne({ wallet_address: player.walletAddress.toLowerCase() }).exec()

      if (!user) {
        console.warn(`User not found in DB for wallet ${player.walletAddress}, skipping token check`)
        return false
      }

      return user.token_nom >= amount
    } catch (error) {
      console.error(`Failed to check if player has enough tokens:`, error)
      return false
    }
  }
}
