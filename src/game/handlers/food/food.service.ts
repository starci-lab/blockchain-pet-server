import { Injectable } from '@nestjs/common'
import { eventBus } from 'src/shared/even-bus'
import { GameRoom } from '../../rooms/game.room'
import { Client } from 'colyseus'
import { FoodItems, InventoryEventData } from '../../types/GameTypes'

@Injectable()
export class FoodService {
  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Listen for food-related events
    eventBus.on('food.get_catalog', (data: { sessionId: string; room: GameRoom; client: Client }) =>
      this.handleGetCatalog(data)
    )
    eventBus.on('food.get_inventory', (data: { sessionId: string; room: GameRoom; client: Client }) =>
      this.handleGetInventory(data)
    )
    eventBus.on('food.purchase_item', (data: InventoryEventData) => this.handlePurchaseItem(data))
    eventBus.on(
      'food.feed_pet',
      (data: {
        sessionId: string
        petId: string
        foodType: string
        quantity: number
        room: GameRoom
        client: Client
      }) => this.handleFeedPet(data)
    )
  }

  // Get food items configuration
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

  // Helper methods for responses
  private createSuccessResponse(data: Record<string, any>, message: string) {
    return {
      success: true,
      data,
      message,
      timestamp: Date.now()
    }
  }

  private createErrorResponse(message: string) {
    return {
      success: false,
      error: message,
      timestamp: Date.now()
    }
  }

  // Event handlers
  private handleGetCatalog(data: { sessionId: string; room: GameRoom; client: Client }) {
    try {
      console.log(`🏪 [FoodService] Handling get catalog request`)

      const catalog = this.getFoodItems()

      // Send response to client
      data.client.send(
        'store_catalog',
        this.createSuccessResponse(
          {
            catalog
          },
          'Store catalog retrieved successfully'
        )
      )
    } catch (error) {
      console.error('❌ [FoodService] Error getting catalog:', error)
      data.client.send('store_catalog', this.createErrorResponse('Failed to get store catalog'))
    }
  }

  private handleGetInventory(data: { sessionId: string; room: GameRoom; client: Client }) {
    try {
      console.log(`📦 [FoodService] Handling get inventory request`)

      // Get player from room
      const player = data.room.state.players.get(data.sessionId)
      if (!player) {
        data.client.send('inventory', this.createErrorResponse('Player not found'))
        return
      }

      // TODO: Implement actual inventory logic
      const inventory = {
        totalItems: 0,
        itemsByType: {},
        items: []
      }

      data.client.send(
        'inventory',
        this.createSuccessResponse(
          {
            inventory
          },
          'Inventory retrieved successfully'
        )
      )
    } catch (error) {
      console.error('❌ [FoodService] Error getting inventory:', error)
      data.client.send('inventory', this.createErrorResponse('Failed to get inventory'))
    }
  }

  private handlePurchaseItem(data: InventoryEventData) {
    try {
      console.log(`🛒 [FoodService] Handling purchase item request:`, data)

      // Validate food type
      if (!this.isValidFoodType(data.itemType)) {
        data.client.send('purchase_result', this.createErrorResponse('Invalid food type'))
        return
      }

      // Get food item details
      const foodItem = this.getFoodItem(data.itemType)
      const totalCost = foodItem.price * data.quantity

      // TODO: Implement actual purchase logic (check player coins, add to inventory, etc.)

      data.client.send(
        'purchase_result',
        this.createSuccessResponse(
          {
            itemType: data.itemType,
            quantity: data.quantity,
            totalCost
          },
          'Item purchased successfully'
        )
      )
    } catch (error) {
      console.error('❌ [FoodService] Error purchasing item:', error)
      data.client.send('purchase_result', this.createErrorResponse('Failed to purchase item'))
    }
  }

  private handleFeedPet(data: {
    sessionId: string
    petId: string
    foodType: string
    quantity: number
    room: GameRoom
    client: Client
  }) {
    try {
      console.log(`🍽️ [FoodService] Handling feed pet request:`, data)

      // Validate food type
      if (!this.isValidFoodType(data.foodType)) {
        data.client.send('feed_result', this.createErrorResponse('Invalid food type'))
        return
      }

      // Get nutrition value
      const nutrition = this.getFoodNutrition(data.foodType)

      // TODO: Implement actual feeding logic (update pet hunger, consume food from inventory, etc.)

      data.client.send(
        'feed_result',
        this.createSuccessResponse(
          {
            petId: data.petId,
            foodType: data.foodType,
            nutrition
          },
          'Pet fed successfully'
        )
      )
    } catch (error) {
      console.error('❌ [FoodService] Error feeding pet:', error)
      data.client.send('feed_result', this.createErrorResponse('Failed to feed pet'))
    }
  }
}
