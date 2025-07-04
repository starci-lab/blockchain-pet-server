import { Pet } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';

export class PetService {
  static createStarterPet(ownerId: string, ownerName: string): Pet {
    const starterPetId = `starter_${ownerId}_${Date.now()}`;

    const pet = new Pet();
    pet.id = starterPetId;
    pet.ownerId = ownerId;
    pet.x = GAME_CONFIG.PETS.DEFAULT_POSITION.x;
    pet.y = GAME_CONFIG.PETS.DEFAULT_POSITION.y;
    pet.petType = GAME_CONFIG.PETS.DEFAULT_TYPE;
    pet.hungerLevel = GAME_CONFIG.PETS.INITIAL_HUNGER;
    pet.speed = GAME_CONFIG.PETS.DEFAULT_SPEED;
    pet.currentActivity = 'idle';
    pet.isChasing = false;

    return pet;
  }

  static createPet(
    petId: string,
    ownerId: string,
    x: number,
    y: number,
    petType?: string,
  ): Pet {
    const pet = new Pet();
    pet.id = petId;
    pet.ownerId = ownerId;
    pet.x = x;
    pet.y = y;
    pet.petType = petType || GAME_CONFIG.PETS.DEFAULT_TYPE;
    pet.hungerLevel = GAME_CONFIG.PETS.INITIAL_HUNGER;
    pet.speed = GAME_CONFIG.PETS.DEFAULT_SPEED;
    pet.currentActivity = 'idle';
    pet.isChasing = false;

    return pet;
  }

  static updateHungerLevels(pets: Map<string, Pet>): number {
    const now = Date.now();
    let hungerUpdatesCount = 0;

    pets.forEach((pet) => {
      const lastUpdate = pet.lastHungerUpdate || now;
      const timeDiff = (now - lastUpdate) / 1000; // seconds

      if (timeDiff >= 1) {
        // Update every second
        const previousHunger = pet.hungerLevel;
        pet.hungerLevel = Math.max(
          0,
          pet.hungerLevel - GAME_CONFIG.PETS.HUNGER_DECREASE_RATE,
        );
        pet.lastHungerUpdate = now;
        hungerUpdatesCount++;
      }
    });

    return hungerUpdatesCount;
  }

  static updatePetActivity(
    pet: Pet,
    activity: string,
    speed?: number,
    x?: number,
    y?: number,
  ): void {
    pet.currentActivity = activity;
    if (speed !== undefined) pet.speed = speed;
    if (x !== undefined) pet.x = x;
    if (y !== undefined) pet.y = y;
  }

  static updatePetChase(
    pet: Pet,
    targetX: number,
    targetY: number,
    isChasing: boolean,
  ): void {
    pet.targetX = targetX;
    pet.targetY = targetY;
    pet.isChasing = isChasing;
    pet.currentActivity = isChasing ? 'chase' : 'walk';
  }

  static feedPet(pet: Pet, hungerAfter: number): void {
    pet.hungerLevel = Math.min(GAME_CONFIG.PETS.INITIAL_HUNGER, hungerAfter);
    pet.lastFedAt = Date.now();
  }

  static getPlayerPets(pets: Map<string, Pet>, ownerId: string): Pet[] {
    return Array.from(pets.values()).filter((pet) => pet.ownerId === ownerId);
  }
}
