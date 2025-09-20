import { Injectable } from '@nestjs/common'
import { FoodItems } from '../types/GameTypes'

@Injectable()
export class FoodService {
  // Get food items configuration (price, nutrition values, etc.)
  getFoodItems(): FoodItems {
    return {
      hamburger: { price: 10, nutrition: 20, name: 'Hamburger' },
      apple: { price: 5, nutrition: 10, name: 'Apple' },
      fish: { price: 15, nutrition: 25, name: 'Fish' }
    }
  }

  // Get nutrition value for a food type
  getFoodNutrition(foodType: string): number {
    const foodItems = this.getFoodItems()
    return foodItems[foodType]?.nutrition || 10
  }

  // Get food price
  getFoodPrice(foodType: string): number {
    const foodItems = this.getFoodItems()
    return foodItems[foodType]?.price || 5
  }

  // Get all available food types
  getAvailableFoodTypes(): string[] {
    return Object.keys(this.getFoodItems())
  }

  // Get food item by type
  getFoodItem(foodType: string) {
    const foodItems = this.getFoodItems()
    return foodItems[foodType] || null
  }

  // Validate if food type exists
  isValidFoodType(foodType: string): boolean {
    const foodItems = this.getFoodItems()
    return foodType in foodItems
  }
}
