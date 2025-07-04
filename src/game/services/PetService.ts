import { Pet } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';

export class PetService {
  static createStarterPet(ownerId: string, ownerName: string): Pet {
    const starterPetId = `starter_${ownerId}_${Date.now()}`;

    const pet = new Pet();
    pet.id = starterPetId;
    pet.ownerId = ownerId;
    pet.petType = GAME_CONFIG.PETS.DEFAULT_TYPE;
    pet.hunger = 100; // Full hunger
    pet.happiness = 100; // Full happiness
    pet.cleanliness = 100; // Full cleanliness
    pet.lastUpdated = Date.now();

    return pet;
  }

  static createPet(petId: string, ownerId: string, petType?: string): Pet {
    const pet = new Pet();
    pet.id = petId;
    pet.ownerId = ownerId;
    pet.petType = petType || GAME_CONFIG.PETS.DEFAULT_TYPE;
    pet.hunger = 100;
    pet.happiness = 100;
    pet.cleanliness = 100;
    pet.lastUpdated = Date.now();

    return pet;
  }

  // Update pet stats over time (hunger, happiness, cleanliness decay)
  static updatePetStats(pets: any): void {
    const now = Date.now();
    const updateInterval = 60000; // 1 minute

    pets.forEach((pet: Pet) => {
      const timeSinceLastUpdate = now - pet.lastUpdated;

      if (timeSinceLastUpdate >= updateInterval) {
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

        // Decay rates per hour
        const hungerDecay = 5; // Lose 5 hunger per hour
        const happinessDecay = 3; // Lose 3 happiness per hour
        const cleanlinessDecay = 2; // Lose 2 cleanliness per hour

        // Apply decay
        pet.hunger = Math.max(0, pet.hunger - hungerDecay * hoursElapsed);
        pet.happiness = Math.max(
          0,
          pet.happiness - happinessDecay * hoursElapsed,
        );
        pet.cleanliness = Math.max(
          0,
          pet.cleanliness - cleanlinessDecay * hoursElapsed,
        );

        pet.lastUpdated = now;

        console.log(
          `📊 Pet ${pet.id} stats updated: hunger=${pet.hunger.toFixed(1)}, happiness=${pet.happiness.toFixed(1)}, cleanliness=${pet.cleanliness.toFixed(1)}`,
        );
      }
    });
  }

  // Feed pet to increase hunger and happiness
  static feedPet(pet: Pet, foodValue: number = 20): void {
    pet.hunger = Math.min(100, pet.hunger + foodValue);
    pet.happiness = Math.min(100, pet.happiness + foodValue * 0.5); // Feeding also makes pet happy
    pet.lastUpdated = Date.now();

    console.log(
      `🍔 Pet ${pet.id} fed. Hunger: ${pet.hunger}, Happiness: ${pet.happiness}`,
    );
  }

  // Play with pet to increase happiness
  static playWithPet(pet: Pet, playValue: number = 15): void {
    pet.happiness = Math.min(100, pet.happiness + playValue);
    pet.lastUpdated = Date.now();

    console.log(`🎾 Played with pet ${pet.id}. Happiness: ${pet.happiness}`);
  }

  // Clean pet to increase cleanliness and happiness
  static cleanPet(pet: Pet, cleanValue: number = 25): void {
    pet.cleanliness = Math.min(100, pet.cleanliness + cleanValue);
    pet.happiness = Math.min(100, pet.happiness + cleanValue * 0.3); // Cleaning makes pet slightly happy
    pet.lastUpdated = Date.now();

    console.log(
      `🧼 Pet ${pet.id} cleaned. Cleanliness: ${pet.cleanliness}, Happiness: ${pet.happiness}`,
    );
  }

  // Get pets owned by specific player
  static getPlayerPets(pets: any, ownerId: string): Pet[] {
    const playerPets: Pet[] = [];
    pets.forEach((pet: Pet) => {
      if (pet.ownerId === ownerId) {
        playerPets.push(pet);
      }
    });
    return playerPets;
  }

  // Get pet stats summary
  static getPetStatsSummary(pet: Pet): any {
    return {
      id: pet.id,
      petType: pet.petType,
      hunger: Math.round(pet.hunger),
      happiness: Math.round(pet.happiness),
      cleanliness: Math.round(pet.cleanliness),
      overallHealth: Math.round(
        (pet.hunger + pet.happiness + pet.cleanliness) / 3,
      ),
      lastUpdated: pet.lastUpdated,
    };
  }
}
