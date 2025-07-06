import { Player, InventoryItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';
import { eventBus } from 'src/shared/even-bus';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { PetService } from './PetService';
import { InventoryService } from './InventoryService';

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

    // Get player's pets
    const playerPets = PetService.getPlayerPets(room.state.pets, sessionId);
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

  static handleGetProfile(eventData: any) {
    const { sessionId, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) {
      client.send('profile-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    console.log(`📋 [Service] Sending profile to ${player.name}`);

    const inventorySummary = InventoryService.getInventorySummary(player);

    client.send('profile-response', {
      success: true,
      profile: {
        sessionId: player.sessionId,
        name: player.name,
        tokens: player.tokens,
        totalPetsOwned: player.totalPetsOwned,
        inventory: inventorySummary,
        joinedAt: Date.now(), // Could be stored in player schema
      },
    });
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
  // Fetch user data from external API/Database
  static async fetchUserData(
    sessionId: string,
    addressWallet?: string,
  ): Promise<any> {
    try {
      // Emit event to fetch user data from your backend/database
      console.log(
        `🔍 Fetching user data for sessionId: ${sessionId}, wallet: ${addressWallet}`,
      );

      // This will emit event to fetch real user data
      const userData = await new Promise((resolve, reject) => {
        eventBus.emit('user.fetch_profile', {
          sessionId,
          addressWallet,
          timestamp: Date.now(),
        });

        // Listen for response from your backend
        const timeout = setTimeout(() => {
          reject(new Error('User data fetch timeout'));
        }, 5000); // 5 second timeout

        eventBus.once(`user.fetch_profile.response.${sessionId}`, (data) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      console.log(`✅ User data fetched:`, userData);
      return userData;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch user data, using defaults:`, error);
      // Return default data if fetch fails
      return {
        name: `Player_${sessionId.substring(0, 6)}`,
        tokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
        totalPetsOwned: 0,
        inventory: [],
      };
    }
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
    // Fetch real user data
    const userData = await this.fetchUserData(sessionId, addressWallet);

    const player = new Player();
    player.sessionId = sessionId;
    player.name =
      userData.name || name || `Player_${sessionId.substring(0, 6)}`;
    player.tokens = userData.tokens || GAME_CONFIG.ECONOMY.INITIAL_TOKENS;
    player.totalPetsOwned = userData.totalPetsOwned || 0;

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

  static addTokens(player: Player, amount: number): void {
    player.tokens += amount;
    console.log(
      `💰 Added ${amount} tokens to ${player.name}. New balance: ${player.tokens}`,
    );

    // Emit event to update tokens in database
    eventBus.emit('user.update_tokens', {
      sessionId: player.sessionId,
      tokens: player.tokens,
      tokensAdded: amount,
      timestamp: Date.now(),
    });
  }

  static deductTokens(player: Player, amount: number): boolean {
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

    // Emit event to update tokens in database
    eventBus.emit('user.update_tokens', {
      sessionId: player.sessionId,
      tokens: player.tokens,
      tokensDeducted: amount,
      timestamp: Date.now(),
    });

    return true;
  }

  // Save player data to database
  static savePlayerData(player: Player): void {
    try {
      const playerData = {
        sessionId: player.sessionId,
        name: player.name,
        tokens: player.tokens,
        totalPetsOwned: player.totalPetsOwned,
        inventory: Array.from(player.inventory.entries()).map(
          ([key, item]) => ({
            itemType: item.itemType,
            itemName: item.itemName,
            quantity: item.quantity,
            totalPurchased: item.totalPurchased,
          }),
        ),
        lastSaved: Date.now(),
      };

      eventBus.emit('user.save_profile', playerData);
      console.log(`💾 Saved player data for ${player.name}`);
    } catch (error) {
      console.error(`❌ Failed to save player data:`, error);
    }
  }
}
