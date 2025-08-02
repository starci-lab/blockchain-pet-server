import { Client, Room } from 'colyseus'
import { eventBus } from 'src/shared/even-bus'
import { GameRoomState } from 'src/game/schemas/game-room.schema'

// Interface for room with logging service
interface RoomWithLogging extends Room<GameRoomState> {
  loggingService?: {
    logStateChange: (event: string, data: any) => void
  }
}

// Interface for purchase item data
interface PurchaseItemData {
  itemType: string
  itemName: string
  quantity: number
}

export class FoodEmitters {
  static purchaseItem(room: RoomWithLogging) {
    return (client: Client, data: PurchaseItemData) => {
      console.log(`🛒 [Handler] Purchase item request:`, data)

      // Emit event to InventoryService for processing
      eventBus.emit('inventory.purchase', {
        sessionId: client.sessionId,
        itemType: data.itemType,
        itemName: data.itemName,
        quantity: data.quantity,
        room,
        client
      } as const)
    }
  }

  // Get store catalog
  static getStoreCatalog(room: RoomWithLogging) {
    return (client: Client) => {
      console.log(`� [Handler] Get store catalog request`)

      // Emit event to InventoryService for processing
      eventBus.emit('inventory.get_catalog', {
        sessionId: client.sessionId,
        room,
        client
      } as const)
    }
  }

  // Get player inventory
  static getInventory(room: RoomWithLogging) {
    return (client: Client) => {
      console.log(`📦 [Handler] Get inventory request`)

      // Emit event to InventoryService for processing
      eventBus.emit('inventory.get', {
        sessionId: client.sessionId,
        room,
        client
      } as const)
    }
  }
}
