import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { InjectModel, InjectConnection } from '@nestjs/mongoose'
import { Model, Connection, ClientSession } from 'mongoose'
import { Player, InventoryItem } from '../../schemas/game-room.schema'
import { eventBus } from 'src/shared/even-bus'
import { PlayerService } from '../player/player.service'
import { StoreItems, InventoryEventData, InventorySummary } from '../../types/GameTypes'
import { Client } from 'colyseus'
import { GameRoom } from '../../rooms/game.room'
import { EMITTER_EVENT_BUS } from '../../constants/message-event-bus'
import { MESSAGE_COLYSEUS } from '../../constants/message-colyseus'
import { StoreItem, StoreItemDocument } from 'src/api/store-item/schemas/store-item.schema'

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

@Injectable()
export class InventoryService {
  constructor(
    @Inject(forwardRef(() => PlayerService)) private playerService: PlayerService,
    @InjectModel(StoreItem.name) private storeItemModel: Model<StoreItemDocument>,
    @InjectConnection() private connection: Connection
  ) {
    this.setupEventListeners()
  }

  // Helper method to execute operations with transaction
  private async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession()

    try {
      let result: T | undefined
      await session.withTransaction(async () => {
        result = await operation(session)
      })
      if (!result) {
        throw new Error('Transaction operation returned undefined result')
      }
      return result
    } finally {
      await session.endSession()
    }
  }

  // Initialize event listeners
  private setupEventListeners() {
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

  // Static method for initializing event listeners (for backward compatibility)
  static initializeEventListeners() {
    console.log('🎧 Initializing InventoryService event listeners...')

    // Listen for purchase events
    eventBus.on(EMITTER_EVENT_BUS.PET.BUY_FOOD, (eventData: InventoryEventData) => {
      // For now, we'll just log that the event was received
      // The actual handling will be done by the injected instances
      console.log('📦 [InventoryService] Purchase event received:', eventData.itemType, eventData.itemId)
    })

    // Listen for catalog requests
    eventBus.on('inventory.get_catalog', () => {
      console.log('📋 [InventoryService] Catalog request received')
    })

    // Listen for inventory requests
    eventBus.on('inventory.get', () => {
      console.log('📦 [InventoryService] Inventory request received')
    })

    console.log('✅ InventoryService event listeners initialized')
  }

  async getStoreItem(itemId: string) {
    try {
      // Use injected storeItemModel directly
      const storeItem = await this.storeItemModel.findOne({ _id: itemId })
      return storeItem
    } catch (error) {
      console.log('Error getting store item:', error)
      throw error
    }
  }

  //TODO: NEW Event handlers
  async handlePurchaseItem(eventData: InventoryEventData) {
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

      // Use transaction for purchase operation
      const result = await this.withTransaction(async (session) => {
        //check store item in database
        const storeItem = await this.getStoreItem(itemId)

        if (!storeItem) {
          throw new Error(`Store item ${itemId} not found`)
        }

        const price = storeItem.cost_nom * quantity

        //check if player has enough tokens
        const hasEnoughTokens = await this.playerService.hasEnoughTokens(player, price)
        if (!hasEnoughTokens) {
          throw new Error('Not enough tokens')
        }

        //deduct tokens from player (with session)
        if (!this.playerService) {
          throw new Error('PlayerService not available')
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const tokenDeducted = await this.playerService.deductTokensWithSession(player, price, session)
        if (!tokenDeducted) {
          throw new Error('Failed to deduct tokens')
        }

        // add item to player inventory
        InventoryService.addItem(player, itemType, itemId, storeItem.name, quantity)

        return {
          success: true,
          message: `Purchased ${quantity}x ${itemId}`,
          newTokenBalance: player.tokens
        }
      })

      //emit event to player
      client.send(MESSAGE_COLYSEUS.ACTION.PURCHASE_RESPONSE, {
        success: true,
        action: 'purchase_item',
        message: result.message,
        newTokenBalance: result.newTokenBalance
      })
    } catch (error) {
      console.log('Error purchasing item:', error)
      eventData.client.send(MESSAGE_COLYSEUS.ACTION.RESPONSE, {
        success: false,
        action: 'purchase_item',
        message: error instanceof Error ? error.message : 'Purchase failed'
      })
    }
  }

  handleGetCatalog(eventData: CatalogEventData) {
    const { client } = eventData

    client.send('store-catalog', {
      success: true,
      catalog: STORE_ITEMS
    })

    console.log(`📋 [Service] Sent store catalog`)
  }

  handleGetInventory(eventData: GetInventoryEventData) {
    const { sessionId, room, client } = eventData
    const player = room.state.players.get(sessionId)

    if (!player) {
      client.send('inventory-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    const inventorySummary = InventoryService.getInventorySummary(player)

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
