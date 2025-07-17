import { DatabaseService } from '../services/DatabaseService';
import { Types } from 'mongoose';

import { Pet } from '../schemas/game-room.schema';
import { GAME_CONFIG } from '../config/GameConfig';
import { eventBus } from 'src/shared/even-bus';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { InventoryService } from './InventoryService';
import { MapSchema } from '@colyseus/schema';
import { PetStatus } from 'src/api/pet/schemas/pet.schema';

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

    // Listen for pet buy events (mua pet mới)
    eventBus.on('pet.buy', this.handleBuyPet.bind(this));

    // Listen for pet eated food events
    eventBus.on('pet.eated_food', this.handleEatedFood.bind(this));

    // Listen for pet cleaned events
    eventBus.on('pet.cleaned', this.handleCleanedPet.bind(this));

    // Listen for pet played events
    eventBus.on('pet.played', this.handlePlayedPet.bind(this));

    console.log('✅ PetService event listeners initialized');
  }
  static async handleBuyPet(eventData: any) {
    const { sessionId, petType, room, client } = eventData;
    const player = room.state.players.get(sessionId);
    if (!player) {
      client.send('buy-pet-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    // Giá pet (có thể lấy từ config hoặc hardcode)
    // const PET_PRICE = GAME_CONFIG.PETS.PRICE || 100;

    const PET_PRICE = 50;
    if (typeof player.tokens !== 'number' || player.tokens < PET_PRICE) {
      client.send('buy-pet-response', {
        success: false,
        message: 'Not enough tokens',
        currentTokens: player.tokens,
      });
      return;
    }

    try {
      // Trừ token
      player.tokens -= PET_PRICE;

      // Lưu token mới vào DB
      const dbService = DatabaseService.getInstance();
      const userModel = dbService.getUserModel();
      await userModel.updateOne(
        { wallet_address: player.walletAddress.toLowerCase() },
        { $inc: { tokens: -PET_PRICE } },
      );
      console.log('update token mua pet nè, player.tokens: ', player.tokens);

      // Tạo pet mới trong DB
      const petModel = dbService.getPetModel();
      const user = await userModel
        .findOne({ wallet_address: player.walletAddress.toLowerCase() })
        .exec();
      if (!user) throw new Error('User not found in DB');
      const newPetDoc = await petModel.create({
        owner_id: user._id,
        type: petType,
        stats: { hunger: 100, happiness: 100, cleanliness: 100 },
      });
      newPetDoc.save();

      // Lấy lại danh sách pet mới nhất từ DB
      const petsFromDb = await this.fetchPetsFromDatabase(player.walletAddress);
      // Cập nhật state cho player
      if (!player.pets) player.pets = new MapSchema<Pet>();
      else player.pets.clear();
      petsFromDb.forEach((pet: Pet) => {
        room.state.pets.set(pet.id, pet);
        player.pets.set(pet.id, pet);
      });
      player.totalPetsOwned = petsFromDb.length;

      // Gửi response về client
      client.send('buy-pet-response', {
        success: true,
        message: 'Mua pet thành công!',
        currentTokens: player.tokens,
        pets: petsFromDb,
      });
      console.log(
        `✅ Player ${player.name} mua pet thành công. Token còn lại: ${player.tokens}`,
      );
    } catch (err) {
      console.error('❌ Lỗi khi mua pet:', err);
      client.send('buy-pet-response', {
        success: false,
        message: 'Lỗi khi mua pet',
        currentTokens: player.tokens,
      });
    }
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
        pet.hunger = dbPet.stats?.hunger ?? 50;
        pet.happiness = dbPet.stats?.happiness ?? 50;
        pet.cleanliness = dbPet.stats?.cleanliness ?? 50;
        pet.lastUpdated = Date.now();
        return pet;
      });
    } catch (err) {
      console.error('❌ Error fetching pets from DB:', err);
      return [];
    }
  }

  // Event handlers
  /**
   * Kết hợp logic mua pet vào createPet:
   * Nếu eventData có isBuyPet=true thì thực hiện logic mua pet (trừ token, tạo pet DB, đồng bộ lại pet),
   * ngược lại chỉ tạo pet local (legacy, không dùng nữa)
   */
  static async handleCreatePet(eventData: any) {
    const { sessionId, petId, petType, room, client, isBuyPet } = eventData;
    const player = room.state.players.get(sessionId);

    if (!player) return;

    // Nếu là luồng mua pet (isBuyPet=true), thực hiện logic mua pet chuẩn backend
    if (isBuyPet) {
      // Giá pet (có thể lấy từ config hoặc hardcode)
      const PET_PRICE = 50;
      if (typeof player.tokens !== 'number' || player.tokens < PET_PRICE) {
        client.send('buy-pet-response', {
          success: false,
          message: 'Not enough tokens',
          currentTokens: player.tokens,
        });
        return;
      }
      try {
        // Trừ token
        player.tokens -= PET_PRICE;

        // Lưu token mới vào DB
        const dbService = DatabaseService.getInstance();
        const userModel = dbService.getUserModel();
        await userModel.updateOne(
          { wallet_address: player.walletAddress.toLowerCase() },
          { $inc: { tokens: -PET_PRICE } },
        );
        // Tạo pet mới trong DB
        const petModel = dbService.getPetModel();
        //TODO: find by type pet ID
        const user = await userModel
          .findOne({ wallet_address: player.walletAddress.toLowerCase() })
          .exec();
        if (!user) throw new Error('User not found in DB');
        const newPetDoc = await petModel.create({
          owner_id: user._id,
          type: '6869e7a0bae4412d2195d11c',
          stats: { hunger: 100, happiness: 100, cleanliness: 100 },
        });
        newPetDoc.save();

        // Lấy lại danh sách pet mới nhất từ DB
        const petsFromDb = await this.fetchPetsFromDatabase(
          player.walletAddress,
        );
        // Cập nhật state cho player
        if (!player.pets) player.pets = new MapSchema<Pet>();
        else player.pets.clear();
        petsFromDb.forEach((pet: Pet) => {
          room.state.pets.set(pet.id, pet);
          player.pets.set(pet.id, pet);
        });
        player.totalPetsOwned = petsFromDb.length;

        // Gửi response về client
        client.send('buy-pet-response', {
          success: true,
          message: 'Mua pet thành công!',
          currentTokens: player.tokens,
          pets: petsFromDb,
        });
        room.loggingService.logStateChange('PET_BOUGHT', {
          petType,
          ownerId: sessionId,
          ownerName: player.name,
          totalPets: player.totalPetsOwned,
        });
        console.log(
          `✅ Player ${player.name} mua pet thành công. Token còn lại: ${player.tokens}`,
        );
      } catch (err) {
        console.error('❌ Lỗi khi mua pet:', err);
        client.send('buy-pet-response', {
          success: false,
          message: 'Lỗi khi mua pet',
          currentTokens: player.tokens,
        });
      }
      return;
    }

    // Legacy: tạo pet local (không dùng nữa, chỉ fallback nếu cần)
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

  // TODO: New code
  static async handleEatedFood(eventData: any) {
    const { sessionId, petId, room, client, hungerLevel } = eventData;
    try {
      const player = room.state.players.get(sessionId);
      const pet = room.state.pets.get(petId);

      if (!player || !pet || pet.owner_id !== player.owner_id) {
        console.log(`❌ Eated food failed - invalid player/pet or ownership`);
        client.send('action-response', {
          success: false,
          action: 'eated_food',
          message: 'Cannot eated food',
        });
        return;
      }

      // Check if pet hunger is allowed to eat
      if (Number(pet.hunger) > Number(GAME_CONFIG.PETS.HUNGER_ALLOW_EAT)) {
        client.send('action-response', {
          success: false,
          action: 'eated_food',
          message: 'Cannot eated: pet hunger is full',
        });
        return;
      }

      // Increase hunger level
      let hunger = +pet.hunger + Number(hungerLevel);
      if (hunger > 100) {
        hunger = 100;
      }

      // Update colesyus state
      pet.hunger = hunger;
      pet.lastUpdated = Date.now();

      // Update colesyus player pets collection
      if (player.pets && player.pets.has(petId)) {
        const playerPet = player.pets.get(petId);
        // TODO: Check if pet is active or no ????
        if (playerPet) {
          playerPet.hunger = hunger;
          playerPet.lastUpdated = Date.now();
        }
      }

      // Update colesyus room state
      if (room.state.pets.has(petId)) {
        room.state.pets.set(petId, pet);
      }

      // Update DB
      const dbService = DatabaseService.getInstance();
      const petModel = dbService.getPetModel();

      const updatedPet = await petModel.findByIdAndUpdate(
        {
          _id: petId,
          status: PetStatus.Active,
        },
        {
          $set: {
            'stats.hunger': hunger,
          },
        },
      );

      if (!updatedPet) {
        client.send('action-response', {
          success: false,
          action: 'eated_food',
          message: 'Cannot eated: pet not found or not active',
        });
        return;
      }

      client.send('action-response', {
        success: true,
        action: 'eated_food',
        message: 'Eated food',
      });

      return;
    } catch (error) {
      console.error('❌ pet eated food error:', error);
      client.send('buy-pet-response', {
        success: false,
        message: 'pet eated food error',
      });
    }
    return;
  }

  // TODO: New code
  static async handleCleanedPet(eventData: any) {
    const { sessionId, petId, room, client, cleanlinessLevel } = eventData;
    try {
      const player = room.state.players.get(sessionId);
      const pet = room.state.pets.get(petId);

      if (!player || !pet || player.owner_id !== pet.owner_id) {
        console.log(`❌ Cleaned pet failed - invalid player/pet or ownership`);
        client.send('action-response', {
          success: false,
          action: 'cleaned_pet',
          message: 'Cannot cleaned pet',
        });
        return;
      }

      // Check if pet cleanliness is allowed to clean
      if (pet.cleanliness > GAME_CONFIG.PETS.CLEANLINESS_ALLOW_CLEAN) {
        client.send('action-response', {
          success: false,
          action: 'cleaned_pet',
          message: 'Cannot cleaned: pet cleanliness is full',
        });
        return;
      }

      // Increase cleanliness level
      let cleanliness = +pet.cleanliness + Number(cleanlinessLevel);
      if (cleanliness > 100) {
        cleanliness = 100;
      }

      // Update colesyus state
      pet.cleanliness = cleanliness;
      pet.lastUpdated = Date.now();

      // Update colesyus player pets collection
      if (player.pets && player.pets.has(petId)) {
        // TODO: Check if pet is active or no ????
        const playerPet = player.pets.get(petId);
        if (playerPet) {
          playerPet.cleanliness = cleanliness;
          playerPet.lastUpdated = Date.now();
        }
      }

      // Update colesyus room state
      if (room.state.pets.has(petId)) {
        room.state.pets.set(petId, pet);
      }

      // Update DB
      const dbService = DatabaseService.getInstance();
      const petModel = dbService.getPetModel();

      const updatedPet = await petModel.findByIdAndUpdate(
        {
          _id: petId,
          status: PetStatus.Active,
        },
        {
          $set: {
            'stats.cleanliness': cleanliness,
          },
        },
      );

      if (!updatedPet) {
        client.send('action-response', {
          success: false,
          action: 'cleaned_pet',
          message: 'Cannot cleaned: pet not found or not active',
        });
        return;
      }

      client.send('action-response', {
        success: true,
        action: 'cleaned_pet',
        message: 'Cleaned pet',
      });

      return;
    } catch (error) {
      console.error('❌ pet cleaned error:', error);
      client.send('action-response', {
        success: false,
        action: 'cleaned_pet',
        message: 'Cannot cleaned: pet not found or not active',
      });
    }
  }

  // TODO: New code
  static async handlePlayedPet(eventData: any) {
    const { sessionId, petId, room, client, happinessLevel } = eventData;
    try {
      const player = room.state.players.get(sessionId);
      const pet = room.state.pets.get(petId);

      if (!player || !pet || player.owner_id !== pet.owner_id) {
        client.send('action-response', {
          success: false,
          action: 'cleaned_pet',
          message: 'Cannot cleaned: pet cleanliness is full',
        });
        return;
      }

      // Check if pet is allowed to play
      if (
        Number(pet.happiness) > Number(GAME_CONFIG.PETS.HAPPINESS_ALLOW_PLAY)
      ) {
        client.send('action-response', {
          success: false,
          action: 'played_pet',
          message: 'Cannot played: pet happiness is full',
        });
        return;
      }

      // Increase happiness level
      let happiness = +pet.happiness + Number(happinessLevel);
      if (happiness > 100) {
        happiness = 100;
      }

      // Update colesyus state
      pet.happiness = happiness;
      pet.lastUpdated = Date.now();

      // Update colesyus player pets collection
      if (player.pets && player.pets.has(petId)) {
        // TODO: Check if pet is active or no ????
        const playerPet = player.pets.get(petId);
        if (playerPet) {
          playerPet.happiness = happiness;
          playerPet.lastUpdated = Date.now();
        }
      }
      // Update colesyus room state
      if (room.state.pets.has(petId)) {
        room.state.pets.set(petId, pet);
      }

      // Cập nhật DB
      const dbService = DatabaseService.getInstance();
      const petModel = dbService.getPetModel();

      const updatedPet = await petModel.findByIdAndUpdate(
        {
          _id: petId,
          status: PetStatus.Active,
        },
        {
          $set: {
            'stats.happiness': happiness,
          },
        },
      );

      if (!updatedPet) {
        client.send('action-response', {
          success: false,
          action: 'played_pet',
          message: 'Cannot played: pet not found or not active',
        });
        return;
      }

      client.send('action-response', {
        success: true,
        action: 'played_pet',
        message: 'Played pet',
      });

      return;
    } catch (error) {
      console.error('❌ Lỗi khi chơi với pet:', error);
      client.send('action-response', {
        success: false,
        action: 'played_pet',
        message: 'Cannot played: pet not found or not active',
      });
    }
    return;
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
