import { Client } from 'colyseus'
import { CreatePetData, RemovePetData } from '../types/MessageTypes'
import { eventBus } from 'src/shared/even-bus'
import { GameRoom } from '../rooms/game.room'
import { MESSAGE_EVENT_BUS } from '../constants/message-event-bus'

export class PetEmitters {
  static buyPet(room: GameRoom) {
    return (client: Client, data: CreatePetData) => {
      console.log(`🐕 [Handler] Create pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.BUY, {
        sessionId: client.sessionId,
        petType: data.petType,
        room,
        client,
        isBuyPet: data.isBuyPet || false // Default to false if not provided
      })
    }
  }

  static removePet(room: GameRoom) {
    return (client: Client, data: RemovePetData) => {
      console.log(`🗑️ [Handler] Remove pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.REMOVE, {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client
      })
    }
  }

  static feedPet(room: GameRoom) {
    return (client: Client, data: { petId: string; foodType: string }) => {
      console.log(`🍔 [Handler] Feed pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.FEED, {
        sessionId: client.sessionId,
        petId: data.petId,
        foodType: data.foodType,
        room,
        client
      })
    }
  }

  static playWithPet(room: GameRoom) {
    return (client: Client, data: { petId: string }) => {
      console.log(`🎾 [Handler] Play with pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.PLAY_WITH_PET, {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client
      })
    }
  }

  static eatedFood(room: GameRoom) {
    return (client: Client, data: { hunger_level: number; pet_id: string; owner_id: string }) => {
      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.EATED_FOOD, {
        sessionId: client.sessionId,
        petId: data.pet_id,
        hungerLevel: data.hunger_level,
        room,
        client
      })
    }
  }

  static cleanedPet(room: GameRoom) {
    console.log('cleanedPet', room)
    return (client: Client, data: { cleanliness_level: number; pet_id: string; owner_id: string }) => {
      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.CLEANED_PET, {
        sessionId: client.sessionId,
        petId: data.pet_id,
        cleanlinessLevel: data.cleanliness_level,
        room,
        client
      })
    }
  }

  static playedPet(room: GameRoom) {
    return (client: Client, data: { happiness_level: number; pet_id: string; owner_id: string }) => {
      // Emit event to PetService for processing
      eventBus.emit(MESSAGE_EVENT_BUS.PET.PLAYED_PET, {
        sessionId: client.sessionId,
        petId: data.pet_id,
        happinessLevel: data.happiness_level,
        room,
        client
      })
    }
  }
}
