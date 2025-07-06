import { Player, InventoryItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';
import { eventBus } from 'src/shared/even-bus';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { PetService } from './PetService';
import { InventoryService } from './InventoryService';
import { DatabaseService } from '../services/DatabaseService';
import { Types } from 'mongoose';
// import { User } from '../models/User'; // Uncomment when User model is created

export class PlayerService {
  // Initialize event listeners for player actions
  static initializeEventListeners() {
    console.log('🎧 Initializing PlayerService event listeners...');

    // Listen for player events
    eventBus.on('player.get_game_config', this.handleGetGameConfig.bind(this));
    eventBus.on('player.get_state', this.handleGetPlayerState.bind(this));
    eventBus.on('player.get_profile', this.handleGetProfile.bind(this));
    eventBus.on(
      'player.claim_daily_reward',
      this.handleClaimDailyReward.bind(this),
    );
    eventBus.on('player.update_settings', this.handleUpdateSettings.bind(this));
    eventBus.on('player.update_tutorial', this.handleUpdateTutorial.bind(this));

    console.log('✅ PlayerService event listeners initialized');
  }

  // Event handlers
  static handleGetGameConfig(eventData: any) {
    const { sessionId, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('game-config-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(`⚙️ [Service] Sending game config to ${player.name}`);

    client.send('game-config-response', {
      success: true,
      config: {
        version: '1.0.0',
        maxPets: 5, // Default max pets per player
        updateInterval: GAME_CONFIG.ROOM.UPDATE_INTERVAL,
        economy: {
          initialTokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
          starterFoodQuantity: GAME_CONFIG.ECONOMY.STARTER_FOOD_QUANTITY,
        },
        pets: {
          defaultType: GAME_CONFIG.PETS.DEFAULT_TYPE,
          hungerDecayRate: 5,
          happinessDecayRate: 3,
          cleanlinessDecayRate: 2,
        },
      },
    });
  }

  static handleGetPlayerState(eventData: any) {
    const { sessionId, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('player-state-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(`👤 [Service] Sending player state to ${player.name}`);

    // Get player's pets from player state
    const playerPets = PetService.getPlayerPets(player);
    const inventorySummary = InventoryService.getInventorySummary(player);

    client.send('player-state-response', {
      success: true,
      player: {
        sessionId: player.sessionId,
        name: player.name,
        tokens: player.tokens,
        totalPetsOwned: player.totalPetsOwned,
        inventory: inventorySummary,
      },
      pets: playerPets.map((pet) => PetService.getPetStatsSummary(pet)),
    });
  }

  static async handleGetProfile(eventData: any) {
    const { sessionId, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('profile-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(`📋 [Service] Fetching profile from DB for ${player.name}`);

    try {
      // Get database service instance
      const dbService = DatabaseService.getInstance();
      if (!dbService) {
        throw new Error('Database service not initialized');
      }

      const userModel = dbService.getUserModel();
      const petModel = dbService.getPetModel();

      // Try to get wallet address from session
      const walletAddress = this.getWalletFromSession(sessionId);
      let user = null;

      if (walletAddress) {
        // Find user by wallet address
        user = await userModel
          .findOne({
            wallet_address: walletAddress.toLowerCase(),
          })
          .exec();
      }

      if (!user) {
        // If no user found in DB, use in-memory player data
        console.log(
          `⚠️ User not found in DB, using in-memory data for ${player.name}`,
        );

        const inventorySummary = InventoryService.getInventorySummary(player);

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
            lastActiveAt: new Date(),
          },
        });
        return;
      }

      // Fetch user's pets from database
      const userPets = await petModel
        .find({ owner_id: user._id })
        .populate('type')
        .exec();

      console.log(
        `🐕 Found ${userPets.length} pets for user ${user.wallet_address}`,
      );

      // Sync pets from database to player state
      await PetService.syncPlayerPetsFromDatabase(player, userPets);

      // Convert user data to profile response
      const profile = {
        sessionId: player.sessionId,
        name: player.name || `Player_${user.wallet_address.substring(0, 6)}`,
        wallet_address: user.wallet_address,
        tokens: player.tokens, // Use in-game tokens (might be different from DB)
        totalPetsOwned: player.totalPetsOwned, // Now accurate from synced pets
        inventory: this.convertDbInventoryToGameFormat([]), // User schema doesn't have inventory yet
        pets: userPets.map((pet: any) => ({
          id: (pet._id as Types.ObjectId).toString(),
          name: pet.name || 'Unnamed Pet',
          type: pet.type?.name || 'chog', // Type is populated
          stats: {
            happiness: pet.stats?.happiness || 0,
            hunger: pet.stats?.hunger || 0,
            cleanliness: pet.stats?.cleanliness || 0,
          },
          status: pet.status,
          createdAt: pet.createdAt || new Date(),
          updatedAt: pet.updatedAt || new Date(),
        })),
        joinedAt: (user as any).createdAt
          ? (user as any).createdAt.getTime()
          : Date.now(),
        lastActiveAt: user.last_active_at || new Date(),
      };

      client.send('profile-response', {
        success: true,
        profile: profile,
      });

      console.log(
        `✅ Profile sent to ${player.name} with ${userPets.length} pets`,
      );
    } catch (error) {
      console.error(
        `❌ Error fetching profile from DB for ${player.name}:`,
        error,
      );

      // Fallback to in-memory data if DB query fails
      const inventorySummary = InventoryService.getInventorySummary(player);

      client.send('profile-response', {
        success: true,
        profile: {
          sessionId: player.sessionId,
          name: player.name,
          wallet_address: this.getWalletFromSession(sessionId),
          tokens: player.tokens,
          totalPetsOwned: player.totalPetsOwned,
          inventory: inventorySummary,
          pets: [],
          joinedAt: Date.now(),
          lastActiveAt: new Date(),
          error: 'Database temporarily unavailable',
        },
      });
    }
  }

  static handleClaimDailyReward(eventData: any) {
    const { sessionId, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('daily-reward-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(`🎁 [Service] Processing daily reward for ${player.name}`);

    // Simple daily reward logic (could be enhanced with actual date checking)
    const rewardTokens = 50;
    const rewardFood = 2;

    // Add tokens
    this.addTokens(player, rewardTokens);

    // Add food items
    InventoryService.addItem(player, 'food', 'apple', rewardFood);

    client.send('daily-reward-response', {
      success: true,
      message: 'Daily reward claimed!',
      rewards: {
        tokens: rewardTokens,
        items: [{ type: 'food', name: 'apple', quantity: rewardFood }],
      },
      newTokenBalance: player.tokens,
    });

    room.loggingService?.logStateChange('DAILY_REWARD_CLAIMED', {
      playerId: sessionId,
      playerName: player.name,
      tokensRewarded: rewardTokens,
      itemsRewarded: [{ type: 'food', name: 'apple', quantity: rewardFood }],
    });
  }

  static handleUpdateSettings(eventData: any) {
    const { sessionId, settings, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('settings-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(`⚙️ [Service] Updating settings for ${player.name}:`, settings);

    // In a real implementation, you'd store settings in player schema or database
    // For now, just acknowledge the update
    client.send('settings-response', {
      success: true,
      message: 'Settings updated successfully',
      settings: settings,
    });

    room.loggingService?.logStateChange('SETTINGS_UPDATED', {
      playerId: sessionId,
      playerName: player.name,
      settings: settings,
    });
  }

  static handleUpdateTutorial(eventData: any) {
    const { sessionId, tutorialData, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('tutorial-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(
      `📚 [Service] Updating tutorial for ${player.name}:`,
      tutorialData,
    );

    // In a real implementation, you'd store tutorial progress in player schema or database
    client.send('tutorial-response', {
      success: true,
      message: 'Tutorial progress updated',
      tutorialData: tutorialData,
    });

    room.loggingService?.logStateChange('TUTORIAL_UPDATED', {
      playerId: sessionId,
      playerName: player.name,
      tutorialData: tutorialData,
    });
  }
  // Fetch user data from MongoDB via Mongoose
  static async fetchUserData(
    sessionId: string,
    addressWallet?: string,
  ): Promise<any> {
    try {
      console.log(
        `🔍 Fetching user data for sessionId: ${sessionId}, wallet: ${addressWallet}`,
      );

      // Get database service instance
      const dbService = DatabaseService.getInstance();
      if (!dbService) {
        console.warn('Database service not initialized, using defaults');
        return this.getDefaultUserData(sessionId);
      }

      const userModel = dbService.getUserModel();
      const petModel = dbService.getPetModel();

      // Try to find user by wallet address or session
      let user = null;

      if (addressWallet) {
        user = await userModel
          .findOne({
            wallet_address: addressWallet.toLowerCase(),
          })
          .exec();
      }

      if (user) {
        console.log(`✅ User data fetched from DB:`, user.wallet_address);
        const petCount = await petModel
          .countDocuments({ owner_id: user._id })
          .exec();

        return {
          sessionId,
          name: `Player_${user.wallet_address.substring(0, 6)}`,
          tokens: user.token_nom || GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
          totalPetsOwned: petCount, // Use actual count from database
          inventory: [], // User schema doesn't have inventory yet
          wallet_address: user.wallet_address,
        };
      }

      // Return default data for new users
      return this.getDefaultUserData(sessionId);
    } catch (error) {
      console.warn(
        `⚠️ Failed to fetch user data from DB, using defaults:`,
        error,
      );
      return this.getDefaultUserData(sessionId);
    }
  }

  private static getDefaultUserData(sessionId: string) {
    return {
      sessionId,
      name: `Player_${sessionId.substring(0, 6)}`,
      tokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
      totalPetsOwned: 0,
      inventory: [],
    };
  }

  static async createNewPlayer({
    sessionId,
    name,
    addressWallet,
  }: {
    sessionId: string;
    name?: string;
    addressWallet?: string;
  }): Promise<Player> {
    const userData = await this.fetchUserData(sessionId, addressWallet);

    const player = new Player();
    player.sessionId = sessionId;
    player.name =
      userData.name || name || `Player_${sessionId.substring(0, 6)}`;
    player.tokens = userData.tokens || GAME_CONFIG.ECONOMY.INITIAL_TOKENS;
    player.totalPetsOwned = userData.totalPetsOwned || 0;
    player.walletAddress = userData.wallet_address || addressWallet || '';

    // Add inventory from fetched data or starter items
    if (userData.inventory && userData.inventory.length > 0) {
      // Load existing inventory from database
      userData.inventory.forEach((item: any) => {
        const inventoryItem = new InventoryItem();
        inventoryItem.itemType = item.itemType;
        inventoryItem.itemName = item.itemName;
        inventoryItem.quantity = item.quantity || 0;
        inventoryItem.totalPurchased = item.totalPurchased || 0;
        player.inventory.set(
          `${item.itemType}_${item.itemName}`,
          inventoryItem,
        );
      });
      console.log(
        `📦 Loaded ${userData.inventory.length} inventory items from database`,
      );
    } else {
      // Add starter items for new user
      const starterApple = new InventoryItem();
      starterApple.itemType = 'food';
      starterApple.itemName = 'apple';
      starterApple.quantity = GAME_CONFIG.ECONOMY.STARTER_FOOD_QUANTITY || 3;
      starterApple.totalPurchased = starterApple.quantity;
      player.inventory.set('food_apple', starterApple);
      console.log(`🎁 Added starter items for new user`);
    }

    // Sync pets from database if user exists
    if (addressWallet) {
      try {
        console.log(
          `🔍 [DEBUG] Attempting to sync pets for wallet: ${addressWallet}`,
        );
        await this.syncPlayerPetsFromDatabase(player, addressWallet);
        console.log(
          `🔄 [DEBUG] Pet sync completed for ${player.name}, totalPets: ${player.totalPetsOwned}`,
        );
      } catch (error) {
        console.warn(`⚠️ Failed to sync pets from database:`, error);
      }
    } else {
      console.log(`👤 [DEBUG] No wallet address provided, skipping pet sync`);
    }

    console.log(
      `👤 Created player: ${player.name} with ${player.tokens} tokens, ${player.totalPetsOwned} pets, ${player.inventory.size} inventory items`,
    );

    // Emit event to track user login
    eventBus.emit('user.login', {
      sessionId,
      addressWallet,
      name: player.name,
      tokens: player.tokens,
      timestamp: Date.now(),
    });

    return player;
  }

  // Sync pets from database to player state during player creation
  static async syncPlayerPetsFromDatabase(
    player: Player,
    walletAddress: string,
  ): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance();
      if (!dbService) {
        console.warn('Database service not initialized, skipping pet sync');
        return;
      }

      const userModel = dbService.getUserModel();
      const petModel = dbService.getPetModel();

      // Find user by wallet address
      const user = await userModel
        .findOne({
          wallet_address: walletAddress.toLowerCase(),
        })
        .exec();

      if (!user) {
        console.log(`👤 New user ${walletAddress}, no pets to sync`);
        return;
      }

      // Fetch user's pets from database
      const userPets = await petModel
        .find({ owner_id: user._id })
        .populate('type')
        .exec();

      if (userPets.length > 0) {
        // Use PetService to sync pets to player state
        await PetService.syncPlayerPetsFromDatabase(player, userPets);
        console.log(
          `🔄 Synced ${userPets.length} pets from database for ${player.name}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error syncing pets from database:`, error);
    }
  }

  static async addTokens(player: Player, amount: number): Promise<void> {
    player.tokens += amount;
    console.log(
      `💰 Added ${amount} tokens to ${player.name}. New balance: ${player.tokens}`,
    );

    // Save to database immediately
    try {
      const dbService = DatabaseService.getInstance();
      if (!dbService) {
        console.warn('Database service not initialized, skipping token save');
        return;
      }

      const walletAddress = this.getWalletFromSession(player.sessionId);
      if (walletAddress) {
        const userModel = dbService.getUserModel();
        await userModel
          .findOneAndUpdate(
            { wallet_address: walletAddress.toLowerCase() },
            { last_active_at: new Date() },
            { upsert: false },
          )
          .exec();
        console.log(`💾 Updated user activity in DB for ${player.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update user activity in DB:`, error);
    }
  }

  static async deductTokens(player: Player, amount: number): Promise<boolean> {
    if (player.tokens < amount) {
      console.log(
        `❌ ${player.name} doesn't have enough tokens. Has: ${player.tokens}, needs: ${amount}`,
      );
      return false;
    }

    player.tokens -= amount;
    console.log(
      `💰 Deducted ${amount} tokens from ${player.name}. New balance: ${player.tokens}`,
    );

    // Save to database immediately
    try {
      const dbService = DatabaseService.getInstance();
      if (!dbService) {
        console.warn('Database service not initialized, skipping token save');
        return true;
      }

      const walletAddress = this.getWalletFromSession(player.sessionId);
      if (walletAddress) {
        const userModel = dbService.getUserModel();
        await userModel
          .findOneAndUpdate(
            { wallet_address: walletAddress.toLowerCase() },
            { last_active_at: new Date() },
            { upsert: false },
          )
          .exec();
        console.log(`💾 Updated user activity in DB for ${player.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update user activity in DB:`, error);
    }

    return true;
  }

  // Save player data to MongoDB via Mongoose
  static async savePlayerData(player: Player): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance();
      if (!dbService) {
        console.warn('Database service not initialized, skipping player save');
        return;
      }

      const walletAddress = this.getWalletFromSession(player.sessionId);
      if (!walletAddress) {
        console.warn(
          `No wallet address found for session ${player.sessionId}, skipping save`,
        );
        return;
      }

      const userModel = dbService.getUserModel();

      // Update user activity timestamp
      await userModel
        .findOneAndUpdate(
          { wallet_address: walletAddress.toLowerCase() },
          { last_active_at: new Date() },
          { upsert: false },
        )
        .exec();

      console.log(`💾 Saved player data to DB for ${player.name}`);
    } catch (error) {
      console.error(`❌ Failed to save player data to DB:`, error);
    }
  }

  // Helper method to convert DB inventory format to game format
  private static convertDbInventoryToGameFormat(dbInventory: any[]): any {
    const gameInventory: any = {};

    dbInventory.forEach((item) => {
      const key = `${item.itemType}_${item.itemName}`;
      gameInventory[key] = {
        itemType: item.itemType,
        itemName: item.itemName,
        quantity: item.quantity || 0,
        totalPurchased: item.totalPurchased || 0,
      };
    });

    return gameInventory;
  }

  // Helper method to get session-wallet mapping
  private static getWalletFromSession(sessionId: string): string | null {
    // TODO: Implement proper session-wallet mapping
    // This could be stored in Redis, memory cache, or derived from JWT token
    // For now, assume sessionId might be wallet address
    return sessionId.startsWith('0x') ? sessionId : null;
  }
}
