import { Player, FoodItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';

export class PlayerService {
  static createNewPlayer(sessionId: string, name?: string): Player {
    const player = new Player();
    player.sessionId = sessionId;
    player.name = name || `Player_${sessionId.substring(0, 6)}`;
    player.isOnline = true;
    player.tokens = GAME_CONFIG.ECONOMY.INITIAL_TOKENS;

    // Add starter food items
    const starterApple = new FoodItem();
    starterApple.id = 'apple';
    starterApple.quantity = GAME_CONFIG.ECONOMY.STARTER_FOOD_QUANTITY;
    starterApple.price = 3;
    player.foodInventory.set('apple', starterApple);

    return player;
  }

  static validateFoodPurchase(
    player: Player,
    foodId: string,
    totalPrice: number,
  ): boolean {
    return player.tokens >= totalPrice;
  }

  static processFoodPurchase(
    player: Player,
    foodId: string,
    price: number,
    quantity: number,
  ): { success: boolean; totalPrice: number } {
    const totalPrice = price * quantity;

    if (!this.validateFoodPurchase(player, foodId, totalPrice)) {
      return { success: false, totalPrice };
    }

    // Deduct tokens
    player.tokens -= totalPrice;

    // Add to inventory
    const existingFood = player.foodInventory.get(foodId);
    const newQuantity = (existingFood?.quantity || 0) + quantity;

    const foodItem = new FoodItem();
    foodItem.id = foodId;
    foodItem.quantity = newQuantity;
    foodItem.price = price;

    player.foodInventory.set(foodId, foodItem);

    return { success: true, totalPrice };
  }

  static consumeFoodFromInventory(player: Player, foodId: string): boolean {
    const foodItem = player.foodInventory.get(foodId);
    if (!foodItem || foodItem.quantity <= 0) {
      return false;
    }

    // Remove from inventory
    if (foodItem.quantity > 1) {
      foodItem.quantity -= 1;
    } else {
      player.foodInventory.delete(foodId);
    }

    return true;
  }
}
