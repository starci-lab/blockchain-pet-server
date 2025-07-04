import { Player, Pet, InventoryItem } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';

export class ResponseBuilder {
  // Simplified purchase response for new inventory system
  static purchaseResponse(
    success: boolean,
    data: {
      itemType: string;
      itemName: string;
      quantity: number;
      totalPrice: number;
      currentTokens: number;
      inventory?: any;
    },
  ) {
    return {
      success,
      itemType: data.itemType,
      itemName: data.itemName,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      currentTokens: data.currentTokens,
      inventory: success ? data.inventory : undefined,
      message: success
        ? `Successfully purchased ${data.quantity}x ${data.itemName}`
        : `Not enough tokens to buy ${data.itemName}. Need ${data.totalPrice}, have ${data.currentTokens}`,
      timestamp: Date.now(),
    };
  }

  static playerStateSync(player: Player) {
    return {
      playerId: player.sessionId,
      tokens: player.tokens,
      totalPetsOwned: player.totalPetsOwned,
      inventory: Object.fromEntries(player.inventory.entries()),
      timestamp: Date.now(),
    };
  }

  static petsStateSync(pets: Pet[]) {
    return {
      pets: pets.map((pet) => ({
        id: pet.id,
        ownerId: pet.ownerId,
        petType: pet.petType,
        hunger: pet.hunger,
        happiness: pet.happiness,
        cleanliness: pet.cleanliness,
        lastUpdated: pet.lastUpdated,
      })),
      timestamp: Date.now(),
    };
  }

  static gameConfig() {
    return {
      pets: {
        defaultType: GAME_CONFIG.PETS.DEFAULT_TYPE,
      },
      economy: {
        initialTokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
      },
      store: {
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
      },
      timestamp: Date.now(),
    };
  }

  static welcomeMessage(playerName: string, roomId: string, roomName: string) {
    return {
      message: `Welcome ${playerName}!`,
      roomId,
      roomName,
      timestamp: Date.now(),
    };
  }

  static removePetResponse(success: boolean, petId: string, error?: string) {
    return {
      success,
      petId,
      error: error || undefined,
      message: success ? `Pet ${petId} removed successfully` : error,
      timestamp: Date.now(),
    };
  }

  // Pet action responses
  static petActionResponse(
    success: boolean,
    action: string,
    petId: string,
    petStats?: any,
    error?: string,
  ) {
    return {
      success,
      action,
      petId,
      petStats: success ? petStats : undefined,
      error: error || undefined,
      message: success ? `${action} successful` : error,
      timestamp: Date.now(),
    };
  }

  // Inventory response
  static inventoryResponse(
    success: boolean,
    inventory?: any,
    tokens?: number,
    error?: string,
  ) {
    return {
      success,
      inventory: success ? inventory : undefined,
      tokens: success ? tokens : undefined,
      error: error || undefined,
      timestamp: Date.now(),
    };
  }
}
