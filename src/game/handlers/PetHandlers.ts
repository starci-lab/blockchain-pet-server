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
        data.x,
        data.y,
        data.petType,
      );

      room.state.pets.set(data.petId, pet);

      room.loggingService.logStateChange('PET_CREATED', {
        petId: data.petId,
        ownerId: client.sessionId,
        ownerName: player.name,
        position: { x: data.x, y: data.y },
        petType: data.petType,
      });

      // Send updated pets state to client after creating pet
      const playerPets = PetService.getPlayerPets(
        room.state.pets,
        client.sessionId,
      );
      client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

      console.log(`✅ Pet ${data.petId} created for ${player.name}`);
      console.log(
        `📤 Sent pets-state-sync with ${playerPets.length} pets to ${player.name}`,
      );
    };
  }

  static updateActivity(room: any) {
    return (client: Client, data: PetActivityData) => {
      const pet = room.state.pets.get(data.petId);
      if (!pet || pet.ownerId !== client.sessionId) return;

      PetService.updatePetActivity(
        pet,
        data.activity,
        data.speed,
        data.x,
        data.y,
      );

      room.loggingService.logStateChange('PET_ACTIVITY_UPDATED', {
        petId: data.petId,
        activity: data.activity,
        speed: data.speed,
        position: { x: data.x, y: data.y },
        ownerId: pet.ownerId,
      });
    };
  }

  static handleChase(room: any) {
    return (client: Client, data: PetChaseData) => {
      const pet = room.state.pets.get(data.petId);
      if (!pet || pet.ownerId !== client.sessionId) return;

      PetService.updatePetChase(
        pet,
        data.targetX,
        data.targetY,
        data.isChasing,
      );

      room.loggingService.logStateChange('PET_CHASE_UPDATED', {
        petId: data.petId,
        targetPosition: { x: data.targetX, y: data.targetY },
        isChasing: data.isChasing,
        activity: pet.currentActivity,
        ownerId: pet.ownerId,
      });
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

      room.loggingService.logStateChange('PET_REMOVED', {
        petId: data.petId,
        ownerId: client.sessionId,
        ownerName: player.name,
        reason: 'manual_removal',
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

      console.log(`✅ Pet ${data.petId} removed for ${player.name}`);
      console.log(
        `📤 Sent pets-state-sync with ${playerPets.length} pets to ${player.name}`,
      );
    };
  }
}
