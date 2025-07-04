import { Player, InventoryItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';

export class PlayerService {
  static createNewPlayer(sessionId: string, name?: string): Player {
    const player = new Player();
    player.sessionId = sessionId;
    player.name = name || `Player_${sessionId.substring(0, 6)}`;
    player.tokens = GAME_CONFIG.ECONOMY.INITIAL_TOKENS;
    player.totalPetsOwned = 0;

    // Add starter items to inventory
    const starterApple = new InventoryItem();
    starterApple.itemType = 'food';
    starterApple.itemName = 'apple';
    starterApple.quantity = GAME_CONFIG.ECONOMY.STARTER_FOOD_QUANTITY || 3;
    starterApple.totalPurchased = starterApple.quantity;
    player.inventory.set('food_apple', starterApple);

    console.log(
      `👤 Created new player: ${player.name} with ${player.tokens} tokens and ${starterApple.quantity} starter apples`,
    );

    return player;
  }

  static addTokens(player: Player, amount: number): void {
    player.tokens += amount;
    console.log(
      `💰 Added ${amount} tokens to ${player.name}. New balance: ${player.tokens}`,
    );
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
    return true;
  }

  static getPlayerSummary(player: Player): any {
    const inventoryItems = Array.from(player.inventory.values());

    return {
      sessionId: player.sessionId,
      name: player.name,
      tokens: player.tokens,
      totalPetsOwned: player.totalPetsOwned,
      inventoryCount: inventoryItems.length,
      totalItemsOwned: inventoryItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
    };
  }
}
