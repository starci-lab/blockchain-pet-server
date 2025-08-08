import { Player, InventoryItem } from '../schemas/game-room.schema'
import { eventBus } from 'src/shared/even-bus'
import { PlayerService } from './PlayerService'
import { StoreItems, InventoryEventData, InventorySummary } from '../types/GameTypes'
import { Client } from 'colyseus'
import { GameRoom } from '../rooms/game.room'
import { EMITTER_EVENT_BUS } from '../constants/message-event-bus'
import { DatabaseService } from '../services/DatabaseService'
import { MESSAGE_COLYSEUS } from '../constants/message-colyseus'

interface CatalogEventData {
  client: Client
}

interface GetInventoryEventData {
  sessionId: string
  room: GameRoom
  client: Client
}

// Simple item store configuration
const STORE_ITEMS: StoreItems = {
  food: {
    hamburger: { price: 10, name: 'Hamburger' },
    apple: { price: 5, name: 'Apple' },
    fish: { price: 15, name: 'Fish' }
  },
  toys: {
    ball: { price: 20, name: 'Ball' },
    rope: { price: 15, name: 'Rope' }
  },
  cleaning: {
    soap: { price: 8, name: 'Soap' },
    brush: { price: 12, name: 'Brush' }
  }
}

export class InventoryService {
  // Initialize event listeners
  static initializeEventListeners() {
    console.log('🎧 Initializing InventoryService event listeners...')

    // Listen for purchase events
    eventBus.on(EMITTER_EVENT_BUS.PET.BUY_FOOD, (eventData: InventoryEventData) => {
      this.handlePurchaseItem(eventData).catch(console.error)
    })

    // Listen for catalog requests
    eventBus.on('inventory.get_catalog', this.handleGetCatalog.bind(this))

    // Listen for inventory requests
    eventBus.on('inventory.get', this.handleGetInventory.bind(this))

    console.log('✅ InventoryService event listeners initialized')
  }

  static async getStoreItem(itemId: string) {
    const dbService = DatabaseService.getInstance()
    const storeItemModel = dbService.getStoreItemModel()
    const storeItem = await storeItemModel.findOne({ id: itemId })
    return storeItem
  }

  //TODO: NEW Event handlers
  static async handlePurchaseItem(eventData: InventoryEventData) {
    try {
      const { sessionId, itemType, itemId, quantity, room, client } = eventData

      if (!itemId) {
        client.send('purchase-response', {
          success: false,
          message: 'Item ID is required'
        })
        return
      }

      const player = room.state.players.get(sessionId)

      if (!player) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, {
          success: false,
          action: 'purchase_item',
          message: 'Player not found'
        })
        return
      }

      //check store item in database
      const storeItem = await this.getStoreItem(itemId)

      if (!storeItem) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, {
          success: false,
          action: 'purchase_item',
          message: `Store item ${itemId} not found`
        })
        return
      }

      const price = storeItem.cost_nom * quantity

      //check if player has enough tokens
      const hasEnoughTokens = await PlayerService.hasEnoughTokens(player, price)
      if (!hasEnoughTokens) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, {
          success: false,
          action: 'purchase_item',
          message: `Not enough tokens`
        })
        return
      }

      //deduct tokens from player
      const tokenDeducted = await PlayerService.deductTokens(player, price)
      if (!tokenDeducted) {
        client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, {
          success: false,
          action: 'purchase_item',
          message: `Failed to deduct tokens`
        })
        return
      }

      // add item to player inventory
      this.addItem(player, itemType, itemId, storeItem.name, quantity)
      //emit event to player
      client.send(MESSAGE_COLYSEUS.ACTION.PURCHASE_RESPONSE, {
        success: true,
        action: 'purchase_item',
        message: `Purchased ${quantity}x ${itemId}`
      })
    } catch (error) {
      console.log('Error purchasing item:', error)
      throw error
    }
  }

  static handleGetCatalog(eventData: CatalogEventData) {
    const { client } = eventData

    client.send('store-catalog', {
      success: true,
      catalog: STORE_ITEMS
    })

    console.log(`📋 [Service] Sent store catalog`)
  }

  static handleGetInventory(eventData: GetInventoryEventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('inventory-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    const inventorySummary = this.getInventorySummary(player)

    client.send('inventory-response', {
      success: true,
      inventory: inventorySummary,
      tokens: player.tokens
    })

    console.log(`📦 [Service] Sent inventory for ${player.name}`)
  }

  // Add item to player inventory
  static addItem(player: Player, itemType: string, itemId: string, itemName: string, quantity: number): void {
    const itemKey = `${itemType}_${itemId}`

    let inventoryItem = player.inventory.get(itemKey)
    if (!inventoryItem) {
      inventoryItem = new InventoryItem()
      inventoryItem.itemType = itemType
      inventoryItem.itemId = itemId
      inventoryItem.quantity = 0
      inventoryItem.itemName = itemName
      inventoryItem.totalPurchased = 0
      player.inventory.set(itemKey, inventoryItem)
    }

    inventoryItem.quantity += quantity
    inventoryItem.totalPurchased += quantity

    console.log(`📦 Added ${quantity}x ${itemId} to ${player.name}'s inventory. Total: ${inventoryItem.quantity}`)
  }

  // Use item from inventory (decrease quantity)
  static useItem(player: Player, itemType: string, itemName: string, quantity: number = 1): boolean {
    const itemKey = `${itemType}_${itemName}`
    const inventoryItem = player.inventory.get(itemKey)

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      console.log(
        `❌ ${player.name} doesn't have enough ${itemName}. Has: ${inventoryItem?.quantity || 0}, needs: ${quantity}`
      )
      return false
    }

    inventoryItem.quantity -= quantity
    console.log(`✅ ${player.name} used ${quantity}x ${itemName}. Remaining: ${inventoryItem.quantity}`)

    // Remove item from inventory if quantity reaches 0
    if (inventoryItem.quantity <= 0) {
      player.inventory.delete(itemKey)
      console.log(`🗑️ Removed ${itemName} from inventory (quantity reached 0)`)
    }

    return true
  }

  // Get item quantity
  static getItemQuantity(player: Player, itemType: string, itemName: string): number {
    const itemKey = `${itemType}_${itemName}`
    const inventoryItem = player.inventory.get(itemKey)
    return inventoryItem ? inventoryItem.quantity : 0
  }

  // Get total quantity of all items of a specific type
  static getTotalItemsByType(player: Player, itemType: string): number {
    let total = 0
    player.inventory.forEach((item) => {
      if (item.itemType === itemType) {
        total += item.quantity
      }
    })
    return total
  }

  // Get inventory summary
  static getInventorySummary(player: Player): InventorySummary {
    const summary: InventorySummary = {
      totalItems: 0,
      itemsByType: {},
      items: []
    }

    player.inventory.forEach((item) => {
      summary.totalItems += item.quantity

      if (!summary.itemsByType[item.itemType]) {
        summary.itemsByType[item.itemType] = 0
      }
      summary.itemsByType[item.itemType] += item.quantity

      summary.items.push({
        type: item.itemType,
        id: item.itemId,
        name: item.itemName,
        quantity: item.quantity,
        totalPurchased: item.totalPurchased
      })
    })

    return summary
  }
}
