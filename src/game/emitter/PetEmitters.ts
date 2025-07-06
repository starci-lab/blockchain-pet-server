import { Client } from 'colyseus';
import {
  CreatePetData,
  PetActivityData,
  PetChaseData,
  RemovePetData,
} from '../types/MessageTypes';
import { eventBus } from 'src/shared/even-bus';

export class PetEmitters {
  static createPet(room: any) {
    return (client: Client, data: CreatePetData) => {
      console.log(`🐕 [Handler] Create pet request:`, data);

      // Emit event to PetService for processing
      eventBus.emit('pet.create', {
        sessionId: client.sessionId,
        petId: data.petId,
        petType: data.petType,
        room,
        client,
      });
    };
  }

  static removePet(room: any) {
    return (client: Client, data: RemovePetData) => {
      console.log(`🗑️ [Handler] Remove pet request:`, data);

      // Emit event to PetService for processing
      eventBus.emit('pet.remove', {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client,
      });
    };
  }

  static feedPet(room: any) {
    return (client: Client, data: { petId: string; foodType: string }) => {
      console.log(`🍔 [Handler] Feed pet request:`, data);

      // Emit event to PetService for processing
      eventBus.emit('pet.feed', {
        sessionId: client.sessionId,
        petId: data.petId,
        foodType: data.foodType,
        room,
        client,
      });
    };
  }

  static playWithPet(room: any) {
    return (client: Client, data: { petId: string }) => {
      console.log(`🎾 [Handler] Play with pet request:`, data);

      // Emit event to PetService for processing
      eventBus.emit('pet.play', {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client,
      });
    };
  }

  static cleanPet(room: any) {
    return (client: Client, data: { petId: string }) => {
      console.log(`🧼 [Handler] Clean pet request:`, data);

      // Emit event to PetService for processing
      eventBus.emit('pet.clean', {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client,
      });
    };
  }
}
