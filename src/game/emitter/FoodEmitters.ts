import { Client } from 'colyseus'
import { eventBus } from 'src/shared/even-bus'
import { GameRoom } from '../rooms/game.room'

export class FoodEmitters {
  static purchaseItem(room: GameRoom) {
    return (client: Client, data: { itemType: string; itemName: string; quantity: number }) => {
      console.log(`🛒 [Handler] Purchase item request:`, data)

      // Emit event to InventoryService for processing
      eventBus.emit('inventory.purchase', {
        sessionId: client.sessionId,
        itemType: data.itemType,
        itemName: data.itemName,
        quantity: data.quantity,
        room,
        client
      })
    }
  }

  // Get store catalog
  static getStoreCatalog(room: GameRoom) {
    return (client: Client) => {
      console.log(`� [Handler] Get store catalog request`)

      // Emit event to InventoryService for processing
      eventBus.emit('inventory.get_catalog', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Get player inventory
  static getInventory(room: GameRoom) {
    return (client: Client) => {
      console.log(`📦 [Handler] Get inventory request`)

      // Emit event to InventoryService for processing
      eventBus.emit('inventory.get', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }
}
