import { Player, Pet, FoodItem } from '../schemas/game-room.schema';
import { PetStateData } from '../types/MessageTypes';
import { GAME_CONFIG } from '../config/GameConfig';

export class ResponseBuilder {
  static foodPurchaseResponse(
    success: boolean,
    data: {
      foodId: string;
      quantity: number;
      totalPrice: number;
      currentTokens: number;
      newInventory?: FoodItem[];
    },
  ) {
    return {
      success,
      foodId: data.foodId,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      currentTokens: data.currentTokens,
      newInventory: success ? data.newInventory : undefined,
      message: success
        ? `Đã mua thành công ${data.quantity}x ${data.foodId}`
        : `Không đủ token để mua ${data.foodId}. Cần ${data.totalPrice}, có ${data.currentTokens}`,
      timestamp: Date.now(),
    };
  }

  static foodDropResponse(success: boolean, error?: string) {
    return {
      success,
      error: error || undefined,
    };
  }

  static playerStateSync(player: Player) {
    return {
      playerId: player.sessionId,
      tokens: player.tokens,
      isOnline: player.isOnline,
      inventory: Object.fromEntries(player.foodInventory.entries()),
      timestamp: Date.now(),
    };
  }

  static petsStateSync(pets: Pet[]) {
    return {
      pets: pets.map(
        (pet) =>
          ({
            id: pet.id,
            ownerId: pet.ownerId,
            x: pet.x,
            y: pet.y,
            hungerLevel: pet.hungerLevel,
            currentActivity: pet.currentActivity,
            isChasing: pet.isChasing,
            speed: pet.speed,
            lastFedAt: pet.lastFedAt,
            lastHungerUpdate: pet.lastHungerUpdate,
          }) as PetStateData,
      ),
      timestamp: Date.now(),
    };
  }

  static gameConfig() {
    return {
      food: {
        items: GAME_CONFIG.FOOD.ITEMS,
      },
      pets: {
        initialHunger: GAME_CONFIG.PETS.INITIAL_HUNGER,
        hungerDecreaseRate: GAME_CONFIG.PETS.HUNGER_DECREASE_RATE,
        movementSpeed: GAME_CONFIG.PETS.DEFAULT_SPEED,
        despawnTime: GAME_CONFIG.FOOD.DESPAWN_TIME,
      },
      economy: {
        initialTokens: GAME_CONFIG.ECONOMY.INITIAL_TOKENS,
      },
      timestamp: Date.now(),
    };
  }

  static welcomeMessage(playerName: string, roomId: string, roomName: string) {
    return {
      message: `Welcome ${playerName}!`,
      roomId,
      roomName,
    };
  }

  static removePetResponse(success: boolean, petId: string, error?: string) {
    return {
      success,
      petId,
      error: error || undefined,
      message: success ? `Pet ${petId} removed successfully` : error,
    };
  }
}
