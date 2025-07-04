import { Client } from 'colyseus';
import {
  FoodPurchaseData,
  FoodDropData,
  PetFeedData,
} from '../types/MessageTypes';
import { PlayerService } from '../services/PlayerService';
import { FoodService } from '../services/FoodService';
import { PetService } from '../services/PetService';
import { ResponseBuilder } from '../utils/ResponseBuilder';

export class FoodHandlers {
  static purchaseFood(room: any) {
    return (client: Client, data: FoodPurchaseData) => {
      const player = room.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🍔 Food purchase from ${player.name}:`, data);

      const quantity = data.quantity || 1;
      const result = PlayerService.processFoodPurchase(
        player,
        data.foodId,
        data.price,
        quantity,
      );

      if (result.success) {
        room.loggingService.logStateChange('FOOD_PURCHASED', {
          playerId: client.sessionId,
          playerName: player.name,
          foodId: data.foodId,
          quantity,
          totalPrice: result.totalPrice,
          newQuantity: player.foodInventory.get(data.foodId)?.quantity,
          playerTokens: player.tokens,
        });
      }

      // Send response
      const response = ResponseBuilder.foodPurchaseResponse(result.success, {
        foodId: data.foodId,
        quantity,
        totalPrice: result.totalPrice,
        currentTokens: player.tokens,
        newInventory: result.success
          ? Array.from(player.foodInventory.values())
          : undefined,
      });

      client.send('food-purchase-response', response);

      if (result.success) {
        console.log(
          `✅ ${player.name} purchased ${quantity}x ${data.foodId} for ${result.totalPrice} tokens`,
        );
      }
    };
  }

  static dropFood(room: any) {
    return (client: Client, data: FoodDropData) => {
      const player = room.state.players.get(client.sessionId);
      if (!player) return;

      const canConsume = PlayerService.consumeFoodFromInventory(
        player,
        data.foodId,
      );
      if (!canConsume) {
        client.send(
          'food-drop-response',
          ResponseBuilder.foodDropResponse(
            false,
            'Không có thức ăn trong inventory',
          ),
        );
        return;
      }

      // Create dropped food in world
      const { id: droppedFoodId, food: droppedFood } =
        FoodService.createDroppedFood(
          data.foodId,
          data.x,
          data.y,
          client.sessionId,
        );

      console.log('drop food', droppedFood);
      room.state.droppedFood.set(droppedFoodId, droppedFood);

      room.loggingService.logStateChange('FOOD_DROPPED', {
        droppedFoodId,
        foodType: data.foodId,
        position: { x: data.x, y: data.y },
        droppedBy: client.sessionId,
        playerName: player.name,
        remainingInventory:
          player.foodInventory.get(data.foodId)?.quantity || 0,
      });

      // Auto-despawn after configured time
      room.clock.setTimeout(() => {
        if (room.state.droppedFood.has(droppedFoodId)) {
          room.state.droppedFood.delete(droppedFoodId);

          room.loggingService.logStateChange('FOOD_DESPAWNED', {
            droppedFoodId,
            foodType: data.foodId,
            position: { x: data.x, y: data.y },
            reason: 'timeout',
            despawnAfterSeconds: FoodService.getDespawnTime() / 1000,
          });

          console.log(
            `🗑️ Food ${droppedFoodId} despawned after ${FoodService.getDespawnTime() / 1000} seconds`,
          );
        }
      }, FoodService.getDespawnTime());

      console.log(
        `🍔 ${player.name} dropped ${data.foodId} at (${data.x}, ${data.y})`,
      );
    };
  }

  static feedPet(room: any) {
    return (client: Client, data: PetFeedData) => {
      const pet = room.state.pets.get(data.petId);
      if (!pet || pet.ownerId !== client.sessionId) return;

      // Update pet hunger
      PetService.feedPet(pet, data.hungerAfter);

      // Remove dropped food if it was from world
      if (room.state.droppedFood.has(data.foodId)) {
        room.state.droppedFood.delete(data.foodId);

        room.loggingService.logStateChange('FOOD_CONSUMED', {
          foodId: data.foodId,
          petId: data.petId,
          consumedBy: client.sessionId,
          petHungerBefore: data.hungerBefore,
          petHungerAfter: pet.hungerLevel,
        });
      }

      console.log(
        `🍽️ Pet ${data.petId} fed with ${data.foodId}, hunger: ${data.hungerBefore} → ${pet.hungerLevel}`,
      );
    };
  }
}
