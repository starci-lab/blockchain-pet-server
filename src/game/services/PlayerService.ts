import { Player, InventoryItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';
import { eventBus } from 'src/shared/even-bus';

export class PlayerService {
  // Fetch user data from external API/Database
  static async fetchUserData(sessionId: string, addressWallet?: string): Promise<any> {
    try {
      // Emit event to fetch user data from your backend/database
      console.log(`🔍 Fetching user data for sessionId: ${sessionId}, wallet: ${addressWallet}`);
      
      // This will emit event to fetch real user data
      const userData = await new Promise((resolve, reject) => {
        eventBus.emit('user.fetch_profile', {
          sessionId,
          addressWallet,
          timestamp: Date.now()
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
        inventory: []
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
    player.name = userData.name || name || `Player_${sessionId.substring(0, 6)}`;
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
        player.inventory.set(`${item.itemType}_${item.itemName}`, inventoryItem);
      });
      console.log(`📦 Loaded ${userData.inventory.length} inventory items from database`);
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
      timestamp: Date.now()
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
      timestamp: Date.now()
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
      timestamp: Date.now()
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
        inventory: Array.from(player.inventory.entries()).map(([key, item]) => ({
          itemType: item.itemType,
          itemName: item.itemName,
          quantity: item.quantity,
          totalPurchased: item.totalPurchased
        })),
        lastSaved: Date.now()
      };

      eventBus.emit('user.save_profile', playerData);
      console.log(`💾 Saved player data for ${player.name}`);
    } catch (error) {
      console.error(`❌ Failed to save player data:`, error);
    }
  }
}
