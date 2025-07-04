import { Client } from 'colyseus';
import { InventoryService } from '../services/InventoryService';
import { ResponseBuilder } from '../utils/ResponseBuilder';

// Simple item store configuration
const STORE_ITEMS = {
  food: {
    hamburger: { price: 10, name: 'Hamburger' },
    apple: { price: 5, name: 'Apple' },
    fish: { price: 15, name: 'Fish' },
  },
  toys: {
    ball: { price: 20, name: 'Ball' },
    rope: { price: 15, name: 'Rope' },
  },
  cleaning: {
    soap: { price: 8, name: 'Soap' },
    brush: { price: 12, name: 'Brush' },
  },
};

export class FoodHandlers {
  static purchaseItem(room: any) {
    return (
      client: Client,
      data: { itemType: string; itemName: string; quantity: number },
    ) => {
      const player = room.state.players.get(client.sessionId);
      if (!player) {
        client.send('purchase-response', {
          success: false,
          message: 'Player not found',
        });
        return;
      }

      // Check if item exists in store
      const categoryItems = (STORE_ITEMS as any)[data.itemType];
      if (!categoryItems || !categoryItems[data.itemName]) {
        client.send('purchase-response', {
          success: false,
          message: `Item ${data.itemName} not found in ${data.itemType} category`,
        });
        return;
      }

      const itemConfig = categoryItems[data.itemName];
      const result = InventoryService.purchaseItem(
        player,
        data.itemType,
        data.itemName,
        data.quantity,
        itemConfig.price,
      );

      // Send response with current inventory
      const inventorySummary = InventoryService.getInventorySummary(player);

      client.send('purchase-response', {
        success: result.success,
        message: result.message,
        currentTokens: result.currentTokens,
        inventory: inventorySummary,
      });

      console.log(`🛒 ${player.name} purchase result: ${result.message}`);
    };
  }

  // Get store catalog
  static getStoreCatalog(room: any) {
    return (client: Client, data: any) => {
      client.send('store-catalog', {
        success: true,
        catalog: STORE_ITEMS,
      });
    };
  }

  // Get player inventory
  static getInventory(room: any) {
    return (client: Client, data: any) => {
      const player = room.state.players.get(client.sessionId);
      if (!player) {
        client.send('inventory-response', {
          success: false,
          message: 'Player not found',
        });
        return;
      }

      const inventorySummary = InventoryService.getInventorySummary(player);

      client.send('inventory-response', {
        success: true,
        inventory: inventorySummary,
        tokens: player.tokens,
      });
    };
  }
}
