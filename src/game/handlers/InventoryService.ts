import { Player, InventoryItem } from '../schemas/game-room.schema'
import { eventBus } from 'src/shared/even-bus'
import { PlayerService } from './PlayerService'
import { StoreItems, InventoryEventData, InventorySummary } from '../types/GameTypes'
import { Client } from 'colyseus'
import { GameRoom } from '../rooms/game.room'

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
    eventBus.on('inventory.purchase', this.handlePurchaseItem.bind(this))

    // Listen for catalog requests
    eventBus.on('inventory.get_catalog', this.handleGetCatalog.bind(this))

    // Listen for inventory requests
    eventBus.on('inventory.get', this.handleGetInventory.bind(this))

    console.log('✅ InventoryService event listeners initialized')
  }

  // Event handlers
  static handlePurchaseItem(eventData: InventoryEventData) {
    const { sessionId, itemType, itemName, quantity, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('purchase-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }
    // TODO: check store item in database
    // const dbService = DatabaseService.getInstance()
    // const storeItemModel = dbService.getStoreItemModel()
    // const storeItem = await storeItemModel.findOne({ name: itemName })
    // if (!storeItem) {
    //   client.send('purchase-response', {
    //     success: false,
    //     message: `Store item ${itemName} not found`
    //   })
    //   return
    // }
    const categoryItems = STORE_ITEMS[itemType]
    if (!categoryItems || !categoryItems[itemName]) {
      client.send('purchase-response', {
        success: false,
        message: `Item ${itemName} not found in ${itemType} category`
      })
      return
    }

    const itemConfig = categoryItems[itemName]
    this.purchaseItem(player, itemType, itemName, quantity, itemConfig.price)
      .then((result) => {
        const inventorySummary = this.getInventorySummary(player)
        client.send('purchase-response', {
          success: result.success,
          message: result.message,
          currentTokens: result.currentTokens,
          inventory: inventorySummary
        })
      })
      .catch((error) => {
        console.error('❌ Error purchasing item:', error)
        client.send('purchase-response', {
          success: false,
          message: 'Failed to purchase item'
        })
      })
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
  static addItem(player: Player, itemType: string, itemName: string, quantity: number): void {
    const itemKey = `${itemType}_${itemName}`

    let inventoryItem = player.inventory.get(itemKey)
    if (!inventoryItem) {
      inventoryItem = new InventoryItem()
      inventoryItem.itemType = itemType
      inventoryItem.itemName = itemName
      inventoryItem.quantity = 0
      inventoryItem.totalPurchased = 0
      player.inventory.set(itemKey, inventoryItem)
    }

    inventoryItem.quantity += quantity
    inventoryItem.totalPurchased += quantity

    console.log(`📦 Added ${quantity}x ${itemName} to ${player.name}'s inventory. Total: ${inventoryItem.quantity}`)
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
        name: item.itemName,
        quantity: item.quantity,
        totalPurchased: item.totalPurchased
      })
    })

    return summary
  }

  // Purchase item (add to inventory and deduct tokens)
  static async purchaseItem(
    player: Player,
    itemType: string,
    itemName: string,
    quantity: number,
    pricePerItem: number
  ): Promise<{ success: boolean; message: string; currentTokens: number }> {
    const totalCost = quantity * pricePerItem

    if (player.tokens < totalCost) {
      return {
        success: false,
        message: `Not enough tokens. Need ${totalCost}, have ${player.tokens}`,
        currentTokens: player.tokens
      }
    }

    // Deduct tokens using PlayerService (this will sync to database)
    const tokenDeducted = await PlayerService.deductTokens(player, totalCost)

    if (!tokenDeducted) {
      return {
        success: false,
        message: `Failed to deduct tokens`,
        currentTokens: player.tokens
      }
    }

    // Add item to inventory
    this.addItem(player, itemType, itemName, quantity)

    console.log(
      `💰 ${player.name} purchased ${quantity}x ${itemName} for ${totalCost} tokens. Remaining tokens: ${player.tokens}`
    )

    return {
      success: true,
      message: `Purchased ${quantity}x ${itemName}`,
      currentTokens: player.tokens
    }
  }
}
