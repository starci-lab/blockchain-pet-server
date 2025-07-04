import { GAME_CONFIG } from '../config/GameConfig';

// Simplified FoodService for the new inventory system
export class FoodService {
  // Get food items configuration (price, nutrition values, etc.)
  static getFoodItems() {
    return {
      hamburger: { price: 10, nutrition: 20, name: 'Hamburger' },
      apple: { price: 5, nutrition: 10, name: 'Apple' },
      fish: { price: 15, nutrition: 25, name: 'Fish' },
    };
  }

  // Get nutrition value for a food type
  static getFoodNutrition(foodType: string): number {
    const foodItems = this.getFoodItems();
    return (foodItems as any)[foodType]?.nutrition || 10;
  }

  // Get food price
  static getFoodPrice(foodType: string): number {
    const foodItems = this.getFoodItems();
    return (foodItems as any)[foodType]?.price || 5;
  }

  // Get all available food types
  static getAvailableFoodTypes(): string[] {
    return Object.keys(this.getFoodItems());
  }
}
