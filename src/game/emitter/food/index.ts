import { Injectable } from '@nestjs/common'
import { Client } from 'colyseus'
import { eventBus } from 'src/shared/even-bus'
import { GameRoom } from '../../rooms/game.room'
import { EMITTER_EVENT_BUS } from '../../constants/message-event-bus'

@Injectable()
export class FoodEmitters {
  // Purchase food item
  purchaseItem(room: GameRoom) {
    return (client: Client, data: { itemType: string; itemName: string; quantity: number; itemId: string }) => {
      console.log(`🛒 [FoodEmitter] Purchase item request:`, data)

      // Emit event to FoodService for processing
      eventBus.emit(EMITTER_EVENT_BUS.PET.BUY_FOOD, {
        sessionId: client.sessionId,
        itemId: data.itemId,
        itemType: data.itemType,
        itemName: data.itemName,
        quantity: data.quantity,
        room,
        client
      })
    }
  }

  // Get store catalog
  getStoreCatalog(room: GameRoom) {
    return (client: Client) => {
      console.log(`🏪 [FoodEmitter] Get store catalog request`)

      // Emit event to FoodService for processing
      eventBus.emit('food.get_catalog', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Get player inventory
  getInventory(room: GameRoom) {
    return (client: Client) => {
      console.log(`📦 [FoodEmitter] Get inventory request`)

      // Emit event to FoodService for processing
      eventBus.emit('food.get_inventory', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Feed pet with food
  feedPet(room: GameRoom) {
    return (client: Client, data: { petId: string; foodType: string; quantity: number }) => {
      console.log(`🍽️ [FoodEmitter] Feed pet request:`, data)

      // Emit event for feeding pet
      eventBus.emit(EMITTER_EVENT_BUS.PET.FEED_PET, {
        sessionId: client.sessionId,
        petId: data.petId,
        foodType: data.foodType,
        quantity: data.quantity,
        room,
        client
      })
    }
  }
}
