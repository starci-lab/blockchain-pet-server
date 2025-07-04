import { Client } from 'colyseus';
import {
  CreatePetData,
  PetActivityData,
  PetChaseData,
  RemovePetData,
} from '../types/MessageTypes';
import { PetService } from '../services/PetService';
import { ResponseBuilder } from '../utils/ResponseBuilder';

export class PetHandlers {
  static createPet(room: any) {
    return (client: Client, data: CreatePetData) => {
      const player = room.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`🐕 Creating pet ${data.petId} for ${player.name}`);

      const pet = PetService.createPet(
        data.petId,
        client.sessionId,
        data.petType,
      );

      room.state.pets.set(data.petId, pet);

      // Update player's pet count
      player.totalPetsOwned = PetService.getPlayerPets(
        room.state.pets,
        client.sessionId,
      ).length;

      room.loggingService.logStateChange('PET_CREATED', {
        petId: data.petId,
        ownerId: client.sessionId,
        ownerName: player.name,
        petType: data.petType,
        totalPets: player.totalPetsOwned,
      });

      // Send updated pets state to client after creating pet
      const playerPets = PetService.getPlayerPets(
        room.state.pets,
        client.sessionId,
      );
      client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

      console.log(
        `✅ Pet ${data.petId} created for ${player.name}. Total pets: ${player.totalPetsOwned}`,
      );
      console.log(
        `📤 Sent pets-state-sync with ${playerPets.length} pets to ${player.name}`,
      );
    };
  }

  static removePet(room: any) {
    return (client: Client, data: RemovePetData) => {
      const player = room.state.players.get(client.sessionId);
      if (!player) return;

      const pet = room.state.pets.get(data.petId);
      if (!pet || pet.ownerId !== client.sessionId) {
        client.send(
          'remove-pet-response',
          ResponseBuilder.removePetResponse(
            false,
            data.petId,
            'Pet not found or not owned by you',
          ),
        );
        return;
      }

      console.log(`🗑️ Removing pet ${data.petId} for ${player.name}`);

      // Remove pet from state
      room.state.pets.delete(data.petId);

      // Update player's pet count
      player.totalPetsOwned = PetService.getPlayerPets(
        room.state.pets,
        client.sessionId,
      ).length;

      room.loggingService.logStateChange('PET_REMOVED', {
        petId: data.petId,
        ownerId: client.sessionId,
        ownerName: player.name,
        reason: 'manual_removal',
        remainingPets: player.totalPetsOwned,
      });

      // Send response to owner
      client.send(
        'remove-pet-response',
        ResponseBuilder.removePetResponse(true, data.petId),
      );

      // Send updated pets state to client after removing pet
      const playerPets = PetService.getPlayerPets(
        room.state.pets,
        client.sessionId,
      );
      client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

      console.log(
        `✅ Pet ${data.petId} removed for ${player.name}. Remaining pets: ${player.totalPetsOwned}`,
      );
      console.log(
        `📤 Sent pets-state-sync with ${playerPets.length} pets to ${player.name}`,
      );
    };
  }

  // Feed pet action
  static feedPet(room: any) {
    return (client: Client, data: { petId: string; foodType: string }) => {
      const player = room.state.players.get(client.sessionId);
      const pet = room.state.pets.get(data.petId);

      if (!player || !pet || pet.ownerId !== client.sessionId) {
        client.send('feed-pet-response', {
          success: false,
          message: 'Pet not found or not owned',
        });
        return;
      }

      // Check if player has food in inventory
      const foodQuantity =
        player.inventory.get(`food_${data.foodType}`)?.quantity || 0;
      if (foodQuantity <= 0) {
        client.send('feed-pet-response', {
          success: false,
          message: 'No food available',
        });
        return;
      }

      // Use food from inventory
      const foodItem = player.inventory.get(`food_${data.foodType}`);
      if (foodItem) {
        foodItem.quantity -= 1;
        if (foodItem.quantity <= 0) {
          player.inventory.delete(`food_${data.foodType}`);
        }
      }

      // Feed pet
      PetService.feedPet(pet, 20); // Restore 20 hunger

      client.send('feed-pet-response', {
        success: true,
        message: `Fed ${pet.id} with ${data.foodType}`,
        petStats: PetService.getPetStatsSummary(pet),
      });

      console.log(`🍔 ${player.name} fed pet ${pet.id} with ${data.foodType}`);
    };
  }

  // Play with pet action
  static playWithPet(room: any) {
    return (client: Client, data: { petId: string }) => {
      const player = room.state.players.get(client.sessionId);
      const pet = room.state.pets.get(data.petId);

      if (!player || !pet || pet.ownerId !== client.sessionId) {
        client.send('play-pet-response', {
          success: false,
          message: 'Pet not found or not owned',
        });
        return;
      }

      // Play with pet
      PetService.playWithPet(pet, 15); // Increase happiness by 15

      client.send('play-pet-response', {
        success: true,
        message: `Played with ${pet.id}`,
        petStats: PetService.getPetStatsSummary(pet),
      });

      console.log(`🎾 ${player.name} played with pet ${pet.id}`);
    };
  }

  // Clean pet action
  static cleanPet(room: any) {
    return (client: Client, data: { petId: string }) => {
      const player = room.state.players.get(client.sessionId);
      const pet = room.state.pets.get(data.petId);

      if (!player || !pet || pet.ownerId !== client.sessionId) {
        client.send('clean-pet-response', {
          success: false,
          message: 'Pet not found or not owned',
        });
        return;
      }

      // Check if player has soap in inventory
      const soapQuantity = player.inventory.get('cleaning_soap')?.quantity || 0;
      if (soapQuantity <= 0) {
        client.send('clean-pet-response', {
          success: false,
          message: 'No soap available',
        });
        return;
      }

      // Use soap from inventory
      const soapItem = player.inventory.get('cleaning_soap');
      if (soapItem) {
        soapItem.quantity -= 1;
        if (soapItem.quantity <= 0) {
          player.inventory.delete('cleaning_soap');
        }
      }

      // Clean pet
      PetService.cleanPet(pet, 25); // Increase cleanliness by 25

      client.send('clean-pet-response', {
        success: true,
        message: `Cleaned ${pet.id}`,
        petStats: PetService.getPetStatsSummary(pet),
      });

      console.log(`🧼 ${player.name} cleaned pet ${pet.id}`);
    };
  }
}
