import { Player, InventoryItem } from '../schemas/game-room.schema';

export class InventoryService {
  // Add item to player inventory
  static addItem(
    player: Player,
    itemType: string,
    itemName: string,
    quantity: number,
  ): void {
    const itemKey = `${itemType}_${itemName}`;

    let inventoryItem = player.inventory.get(itemKey);
    if (!inventoryItem) {
      inventoryItem = new InventoryItem();
      inventoryItem.itemType = itemType;
      inventoryItem.itemName = itemName;
      inventoryItem.quantity = 0;
      inventoryItem.totalPurchased = 0;
      player.inventory.set(itemKey, inventoryItem);
    }

    inventoryItem.quantity += quantity;
    inventoryItem.totalPurchased += quantity;

    console.log(
      `📦 Added ${quantity}x ${itemName} to ${player.name}'s inventory. Total: ${inventoryItem.quantity}`,
    );
  }

  // Use item from inventory (decrease quantity)
  static useItem(
    player: Player,
    itemType: string,
    itemName: string,
    quantity: number = 1,
  ): boolean {
    const itemKey = `${itemType}_${itemName}`;
    const inventoryItem = player.inventory.get(itemKey);

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      console.log(
        `❌ ${player.name} doesn't have enough ${itemName}. Has: ${inventoryItem?.quantity || 0}, needs: ${quantity}`,
      );
      return false;
    }

    inventoryItem.quantity -= quantity;
    console.log(
      `✅ ${player.name} used ${quantity}x ${itemName}. Remaining: ${inventoryItem.quantity}`,
    );

    // Remove item from inventory if quantity reaches 0
    if (inventoryItem.quantity <= 0) {
      player.inventory.delete(itemKey);
      console.log(`🗑️ Removed ${itemName} from inventory (quantity reached 0)`);
    }

    return true;
  }

  // Get item quantity
  static getItemQuantity(
    player: Player,
    itemType: string,
    itemName: string,
  ): number {
    const itemKey = `${itemType}_${itemName}`;
    const inventoryItem = player.inventory.get(itemKey);
    return inventoryItem ? inventoryItem.quantity : 0;
  }

  // Get total quantity of all items of a specific type
  static getTotalItemsByType(player: Player, itemType: string): number {
    let total = 0;
    player.inventory.forEach((item) => {
      if (item.itemType === itemType) {
        total += item.quantity;
      }
    });
    return total;
  }

  // Get inventory summary
  static getInventorySummary(player: Player): any {
    const summary: any = {
      totalItems: 0,
      itemsByType: {},
      items: [],
    };

    player.inventory.forEach((item) => {
      summary.totalItems += item.quantity;

      if (!summary.itemsByType[item.itemType]) {
        summary.itemsByType[item.itemType] = 0;
      }
      summary.itemsByType[item.itemType] += item.quantity;

      summary.items.push({
        type: item.itemType,
        name: item.itemName,
        quantity: item.quantity,
        totalPurchased: item.totalPurchased,
      });
    });

    return summary;
  }

  // Purchase item (add to inventory and deduct tokens)
  static purchaseItem(
    player: Player,
    itemType: string,
    itemName: string,
    quantity: number,
    pricePerItem: number,
  ): { success: boolean; message: string; currentTokens: number } {
    const totalCost = quantity * pricePerItem;

    if (player.tokens < totalCost) {
      return {
        success: false,
        message: `Not enough tokens. Need ${totalCost}, have ${player.tokens}`,
        currentTokens: player.tokens,
      };
    }

    // Deduct tokens
    player.tokens -= totalCost;

    // Add item to inventory
    this.addItem(player, itemType, itemName, quantity);

    console.log(
      `💰 ${player.name} purchased ${quantity}x ${itemName} for ${totalCost} tokens. Remaining tokens: ${player.tokens}`,
    );

    return {
      success: true,
      message: `Purchased ${quantity}x ${itemName}`,
      currentTokens: player.tokens,
    };
  }
}
