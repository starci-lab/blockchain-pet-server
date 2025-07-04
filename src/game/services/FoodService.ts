import { FoodItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';

export class FoodService {
  static createDroppedFood(
    foodId: string,
    x: number,
    y: number,
    droppedBy: string,
  ): { id: string; food: FoodItem } {
    const droppedFoodId = `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const droppedFood = new FoodItem();
    droppedFood.id = droppedFoodId;
    droppedFood.foodType = foodId;
    droppedFood.x = x;
    droppedFood.y = y;
    droppedFood.quantity = 1;
    droppedFood.droppedBy = droppedBy;
    droppedFood.droppedAt = Date.now();

    return { id: droppedFoodId, food: droppedFood };
  }

  static getDespawnTime(): number {
    return GAME_CONFIG.FOOD.DESPAWN_TIME;
  }

  static getFoodItems() {
    return GAME_CONFIG.FOOD.ITEMS;
  }
}
