import { DatabaseService } from '../services/DatabaseService';
import { Types } from 'mongoose';

import { Pet } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';
import { eventBus } from 'src/shared/even-bus';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { InventoryService } from './InventoryService';
import { MapSchema } from '@colyseus/schema';

export class PetService {
  // Initialize event listeners
  static initializeEventListeners() {
    console.log('🎧 Initializing PetService event listeners...');

    // Listen for pet creation events
    eventBus.on('pet.create', this.handleCreatePet.bind(this));

    // Listen for pet removal events
    eventBus.on('pet.remove', this.handleRemovePet.bind(this));

    // Listen for pet feeding events
    eventBus.on('pet.feed', this.handleFeedPet.bind(this));

    // Listen for pet playing events
    eventBus.on('pet.play', this.handlePlayWithPet.bind(this));

    // Listen for pet cleaning events
    eventBus.on('pet.clean', this.handleCleanPet.bind(this));

    console.log('✅ PetService event listeners initialized');
  }

  /**
   * Fetch all pets of a user from the database by wallet address
   * @param walletAddress string
   * @returns Promise<Pet[]>
   */
  static async fetchPetsFromDatabase(walletAddress: string): Promise<Pet[]> {
    if (!walletAddress) return [];
    try {
      const dbService = DatabaseService.getInstance();
      if (!dbService) throw new Error('Database service not initialized');
      const userModel = dbService.getUserModel();
      const petModel = dbService.getPetModel();
      // Find user by wallet address
      const user = await userModel
        .findOne({ wallet_address: walletAddress.toLowerCase() })
        .exec();
      if (!user) return [];
      // Find all pets by user._id
      const dbPets = await petModel
        .find({ owner_id: user._id })
        .populate('type')
        .exec();
      // Convert dbPets to game Pet objects
      return dbPets.map((dbPet: any) => {
        const pet = new Pet();
        pet.id = dbPet._id.toString();
        pet.ownerId = walletAddress;
        pet.petType = dbPet.type?.name || 'chog';
        pet.hunger = dbPet.stats?.hunger || 50;
        pet.happiness = dbPet.stats?.happiness || 50;
        pet.cleanliness = dbPet.stats?.cleanliness || 50;
        pet.lastUpdated = Date.now();
        return pet;
      });
    } catch (err) {
      console.error('❌ Error fetching pets from DB:', err);
      return [];
    }
  }

  // Event handlers
  static handleCreatePet(eventData: any) {
    const { sessionId, petId, petType, room, client } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) return;

    console.log(`🐕 [Service] Creating pet ${petId} for ${player.name}`);

    const pet = this.createPet(petId, sessionId, petType);

    // Add pet to room state
    room.state.pets.set(petId, pet);

    // Add pet to player's pets collection
    if (!player.pets) {
      player.pets = new MapSchema<Pet>();
    }
    player.pets.set(petId, pet);

    // Update player's pet count
    player.totalPetsOwned = this.getPlayerPets(player).length;

    room.loggingService.logStateChange('PET_CREATED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      petType,
      totalPets: player.totalPetsOwned,
    });

    // Send updated pets state to client
    console.log('🔄 Sending pets-state-sync after create pet...');
    const playerPets = this.getPlayerPets(player);
    console.log(
      `📤 Player ${player.name} has ${playerPets.length} pets to sync`,
    );
    client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

    console.log(
      `✅ Pet ${petId} created for ${player.name}. Total pets: ${player.totalPetsOwned}`,
    );
  }

  static handleRemovePet(eventData: any) {
    const { sessionId, petId, room, client } = eventData;
    const player = room.state.players.get(sessionId);
    const pet = room.state.pets.get(petId);

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Remove pet failed - invalid player/pet or ownership`);
      return;
    }

    console.log(`🗑️ [Service] Removing pet ${petId} for ${player.name}`);

    // Remove pet from room state
    room.state.pets.delete(petId);

    // Remove pet from player's pets collection
    if (player.pets) {
      player.pets.delete(petId);
    }

    // Update player's pet count
    player.totalPetsOwned = this.getPlayerPets(player).length;

    room.loggingService.logStateChange('PET_REMOVED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      totalPets: player.totalPetsOwned,
    });

    // Send updated pets state to client
    console.log('🔄 Sending pets-state-sync after remove pet...');
    const playerPets = this.getPlayerPets(player);
    console.log(
      `📤 Player ${player.name} has ${playerPets.length} pets remaining`,
    );
    client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

    console.log(
      `✅ Pet ${petId} removed for ${player.name}. Remaining pets: ${player.totalPetsOwned}`,
    );
  }

  static handleFeedPet(eventData: any) {
    const { sessionId, petId, foodType, room, client } = eventData;
    const player = room.state.players.get(sessionId);
    const pet = room.state.pets.get(petId);

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Feed pet failed - invalid player/pet or ownership`);
      client.send('action-response', {
        success: false,
        action: 'feed',
        message: 'Cannot feed this pet',
      });
      return;
    }

    // Check if player has the food item
    const foodQuantity = InventoryService.getItemQuantity(
      player,
      'food',
      foodType,
    );

    if (foodQuantity <= 0) {
      console.log(`❌ ${player.name} doesn't have ${foodType} to feed pet`);
      client.send('action-response', {
        success: false,
        action: 'feed',
        message: `You don't have any ${foodType}`,
      });
      return;
    }

    console.log(
      `🍔 [Service] ${player.name} feeding pet ${petId} with ${foodType}`,
    );

    // Use food from inventory
    InventoryService.useItem(player, 'food', foodType, 1);

    // Feed the pet (increase hunger)
    this.feedPet(pet, 25); // Food restores 25 hunger points

    // Send success response with updated stats
    client.send('action-response', {
      success: true,
      action: 'feed',
      message: `Fed ${foodType} to your pet`,
      petStats: this.getPetStatsSummary(pet),
      inventory: InventoryService.getInventorySummary(player),
    });

    // Also sync updated pets state to client
    console.log('🔄 Sending pets-state-sync after feed pet...');
    const playerPets = this.getPlayerPets(player);
    console.log(`📤 Syncing ${playerPets.length} pets with updated stats`);
    client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

    room.loggingService.logStateChange('PET_FED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      foodType,
      newHunger: pet.hunger,
      newHappiness: pet.happiness,
    });

    console.log(
      `✅ ${player.name} fed pet ${petId}. New stats: hunger=${pet.hunger}, happiness=${pet.happiness}`,
    );
  }

  static handlePlayWithPet(eventData: any) {
    const { sessionId, petId, room, client } = eventData;
    const player = room.state.players.get(sessionId);
    const pet = room.state.pets.get(petId);

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Play with pet failed - invalid player/pet or ownership`);
      client.send('action-response', {
        success: false,
        action: 'play',
        message: 'Cannot play with this pet',
      });
      return;
    }

    console.log(`🎾 [Service] ${player.name} playing with pet ${petId}`);

    // Play with the pet (increase happiness)
    this.playWithPet(pet, 20);

    // Send success response with updated stats
    client.send('action-response', {
      success: true,
      action: 'play',
      message: 'Played with your pet',
      petStats: this.getPetStatsSummary(pet),
    });

    // Also sync updated pets state to client
    const playerPets = this.getPlayerPets(player);
    client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

    room.loggingService.logStateChange('PET_PLAYED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      newHappiness: pet.happiness,
    });

    console.log(
      `✅ ${player.name} played with pet ${petId}. New happiness: ${pet.happiness}`,
    );
  }

  static handleCleanPet(eventData: any) {
    const { sessionId, petId, room, client } = eventData;
    const player = room.state.players.get(sessionId);
    const pet = room.state.pets.get(petId);

    if (!player || !pet || pet.ownerId !== sessionId) {
      console.log(`❌ Clean pet failed - invalid player/pet or ownership`);
      client.send('action-response', {
        success: false,
        action: 'clean',
        message: 'Cannot clean this pet',
      });
      return;
    }

    console.log(`🧼 [Service] ${player.name} cleaning pet ${petId}`);

    // Clean the pet (increase cleanliness)
    this.cleanPet(pet, 30);

    // Send success response with updated stats
    client.send('action-response', {
      success: true,
      action: 'clean',
      message: 'Cleaned your pet',
      petStats: this.getPetStatsSummary(pet),
    });

    // Also sync updated pets state to client
    const playerPets = this.getPlayerPets(player);
    client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets));

    room.loggingService.logStateChange('PET_CLEANED', {
      petId,
      ownerId: sessionId,
      ownerName: player.name,
      newCleanliness: pet.cleanliness,
      newHappiness: pet.happiness,
    });

    console.log(
      `✅ ${player.name} cleaned pet ${petId}. New stats: cleanliness=${pet.cleanliness}, happiness=${pet.happiness}`,
    );
  }

  // Core pet creation and management methods
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

  // Update pet stats over time for a specific player (hunger, happiness, cleanliness decay)
  static updatePlayerPetStats(player: any): void {
    if (!player.pets) return;

    const now = Date.now();
    const updateInterval = 60000; // 1 minute

    player.pets.forEach((pet: Pet) => {
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

  // Update pet stats over time for all pets in room (legacy method)
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

  // Get pets owned by specific player from player state
  static getPlayerPets(player: any): Pet[] {
    const playerPets: Pet[] = [];
    if (player && player.pets) {
      player.pets.forEach((pet: Pet) => {
        playerPets.push(pet);
      });
    }
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

  // Sync pets from database to player state
  static async syncPlayerPetsFromDatabase(
    player: any,
    userPets: any[],
  ): Promise<void> {
    console.log(
      `🔄 [Service] Syncing ${userPets.length} pets from database for ${player.name}`,
    );

    // Initialize player pets collection if not exists
    if (!player.pets) {
      player.pets = new MapSchema<Pet>();
    }

    // Clear existing pets
    player.pets.clear();

    // Add pets from database to player state
    userPets.forEach((dbPet: any) => {
      const pet = new Pet();
      pet.id = dbPet._id.toString();
      pet.ownerId = player.sessionId;
      pet.petType = dbPet.type?.name || 'chog';
      pet.hunger = dbPet.stats?.hunger || 50;
      pet.happiness = dbPet.stats?.happiness || 50;
      pet.cleanliness = dbPet.stats?.cleanliness || 50;
      pet.lastUpdated = Date.now();

      player.pets.set(pet.id, pet);
    });

    // Update player's pet count
    player.totalPetsOwned = this.getPlayerPets(player).length;

    console.log(
      `✅ [Service] Synced ${player.totalPetsOwned} pets for ${player.name}`,
    );
  }
}
