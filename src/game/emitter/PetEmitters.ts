import { Client } from 'colyseus'
import { CreatePetData, PetActivityData, PetChaseData, RemovePetData } from '../types/MessageTypes'
import { eventBus } from 'src/shared/even-bus'

export class PetEmitters {
  // Buy pet emitter: nhận request mua pet từ client, emit event cho PetService xử lý
  static buyPet(room: any) {
    return async (client: Client, data: { petType: string }) => {
      console.log(`🛒 [Handler] Buy pet request:`, data)
      // Emit event để PetService xử lý logic mua pet
      eventBus.emit('pet.buy', {
        sessionId: client.sessionId,
        petType: data.petType,
        room,
        client
      })
    }
  }
  static createPet(room: any) {
    return (client: Client, data: CreatePetData) => {
      console.log(`🐕 [Handler] Create pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit('pet.create', {
        sessionId: client.sessionId,
        petId: data.petId,
        petType: data.petType,
        room,
        client,
        isBuyPet: data.isBuyPet || false // Default to false if not provided
      })
    }
  }

  static removePet(room: any) {
    return (client: Client, data: RemovePetData) => {
      console.log(`🗑️ [Handler] Remove pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit('pet.remove', {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client
      })
    }
  }

  static feedPet(room: any) {
    return (client: Client, data: { petId: string; foodType: string }) => {
      console.log(`🍔 [Handler] Feed pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit('pet.feed', {
        sessionId: client.sessionId,
        petId: data.petId,
        foodType: data.foodType,
        room,
        client
      })
    }
  }

  static playWithPet(room: any) {
    return (client: Client, data: { petId: string }) => {
      console.log(`🎾 [Handler] Play with pet request:`, data)

      // Emit event to PetService for processing
      eventBus.emit('pet.play', {
        sessionId: client.sessionId,
        petId: data.petId,
        room,
        client
      })
    }
  }

  static eatedFood(room: any) {
    return (client: Client, data: { hunger_level: number; pet_id: string; owner_id: string }) => {
      // Emit event to PetService for processing
      eventBus.emit('pet.eated_food', {
        sessionId: client.sessionId,
        petId: data.pet_id,
        hungerLevel: data.hunger_level,
        room,
        client
      })
    }
  }

  static cleanedPet(room: any) {
    console.log('cleanedPet', room)
    return (client: Client, data: { cleanliness_level: number; pet_id: string; owner_id: string }) => {
      // Emit event to PetService for processing
      eventBus.emit('pet.cleaned', {
        sessionId: client.sessionId,
        petId: data.pet_id,
        cleanlinessLevel: data.cleanliness_level,
        room,
        client
      })
    }
  }

  static playedPet(room: any) {
    return (client: Client, data: { happiness_level: number; pet_id: string; owner_id: string }) => {
      // Emit event to PetService for processing
      eventBus.emit('pet.played', {
        sessionId: client.sessionId,
        petId: data.pet_id,
        happinessLevel: data.happiness_level,
        room,
        client
      })
    }
  }
}
