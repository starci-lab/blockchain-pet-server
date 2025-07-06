import { Room, Client } from 'colyseus';
import { GameRoomState, Player, Pet } from '../schemas/game-room.schema';
import { PetHandlers } from '../handlers/PetHandlers';
import { FoodHandlers } from '../handlers/FoodHandlers';
import { PlayerModule } from '../handlers/player';
import { PlayerService } from '../services/PlayerService';
import { PetService } from '../services/PetService';
import { LoggingService } from '../services/LoggingService';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { GAME_CONFIG } from '../config/GameConfig';

export class GameRoom extends Room<GameRoomState> {
  maxClients = GAME_CONFIG.ROOM.MAX_CLIENTS; // Single player only
  public loggingService: LoggingService;
  private lastPlayerSave: number = 0;

  onCreate(options: any) {
    this.loggingService = new LoggingService(this);
    this.initializeRoom(options);
    this.setupMessageHandlers();
    this.startGameLoop();
  }

  private initializeRoom(options: any) {
    // Initialize room state using setState
    this.setState(new GameRoomState());
    this.state.roomName = options?.name || 'Pet Simulator Room';

    this.loggingService.logRoomCreated();
  }

  private startGameLoop() {
    // Initialize game timer for hunger decrease
    this.setSimulationInterval(() => {
      this.updateGameLogic();
    }, GAME_CONFIG.ROOM.UPDATE_INTERVAL);

    console.log('✅ Pet Simulator Room initialized successfully');
  }

  private setupMessageHandlers() {
    // Pet handlers
    this.onMessage('create-pet', PetHandlers.createPet(this));
    this.onMessage('remove-pet', PetHandlers.removePet(this));
    this.onMessage('feed-pet', PetHandlers.feedPet(this));
    this.onMessage('play-pet', PetHandlers.playWithPet(this));
    this.onMessage('clean-pet', PetHandlers.cleanPet(this));

    // Store/Item handlers
    this.onMessage('purchase-item', FoodHandlers.purchaseItem(this));
    this.onMessage('get-store-catalog', FoodHandlers.getStoreCatalog(this));
    this.onMessage('get-inventory', FoodHandlers.getInventory(this));

    // Player handlers (using modular approach)
    this.onMessage('request-game-config', PlayerModule.requestGameConfig(this));
    this.onMessage(
      'request-player-state',
      PlayerModule.requestPlayerState(this),
    );
    this.onMessage('get-profile', PlayerModule.getProfile(this));
    this.onMessage('claim-daily-reward', PlayerModule.claimDailyReward(this));

    // Player action modules
    this.onMessage('update-settings', PlayerModule.updateSettings(this));
    this.onMessage('update-tutorial', PlayerModule.updateTutorial(this));

    console.log('✅ Message handlers setup complete (with modular structure)');
  }

  private updateGameLogic() {
    // Update pet stats over time (hunger, happiness, cleanliness decay)
    PetService.updatePetStats(this.state.pets);

    // Periodically save player data (every 5 minutes)
    const now = Date.now();
    if (!this.lastPlayerSave || now - this.lastPlayerSave >= 5 * 60 * 1000) {
      this.saveAllPlayerData();
      this.lastPlayerSave = now;
    }

    // Log periodic state summary
    this.loggingService.periodicStateSummary();
  }

  private saveAllPlayerData() {
    let savedCount = 0;
    this.state.players.forEach((player) => {
      PlayerService.savePlayerData(player);
      savedCount++;
    });

    if (savedCount > 0) {
      console.log(`💾 Auto-saved data for ${savedCount} players`);
    }
  }

  async onJoin(client: Client, options: any) {
    console.log(`👋 Player joined: ${client.sessionId}`, options);

    try {
      // Create new player using async service to fetch real user data
      const player = await PlayerService.createNewPlayer({
        sessionId: client.sessionId,
        name: options?.name,
        addressWallet: options?.addressWallet || '',
      });

      // Add to room state
      this.state.players.set(client.sessionId, player);
      this.state.playerCount = this.state.players.size;

      this.handleNewPlayerPets(client, player);
      this.loggingService.logPlayerJoined(player);
      this.sendWelcomeMessage(client, player);

      console.log(
        `✅ ${player.name} joined successfully. Total players: ${this.state.playerCount}`,
      );
    } catch (error) {
      console.error(
        `❌ Failed to create player for ${client.sessionId}:`,
        error,
      );

      // Create fallback player with minimal data
      const fallbackPlayer = new Player();
      fallbackPlayer.sessionId = client.sessionId;
      fallbackPlayer.name =
        options?.name || `Player_${client.sessionId.substring(0, 6)}`;
      fallbackPlayer.tokens = GAME_CONFIG.ECONOMY.INITIAL_TOKENS;
      fallbackPlayer.totalPetsOwned = 0;

      this.state.players.set(client.sessionId, fallbackPlayer);
      this.state.playerCount = this.state.players.size;

      this.handleNewPlayerPets(client, fallbackPlayer);
      this.sendWelcomeMessage(client, fallbackPlayer);

      console.log(`⚠️ Created fallback player for ${client.sessionId}`);
    }
  }

  private handleNewPlayerPets(client: Client, player: Player) {
    // Auto-create starter pet for new player (only if they don't have any pets)
    const existingPets = PetService.getPlayerPets(
      this.state.pets,
      client.sessionId,
    );

    if (existingPets.length === 0) {
      const starterPet = PetService.createStarterPet(
        client.sessionId,
        player.name,
      );
      this.state.pets.set(starterPet.id, starterPet);

      console.log(`🎁 Starter pet created for new player ${player.name}`);

      // Send updated pets state immediately after creating starter pet
      const updatedPets = PetService.getPlayerPets(
        this.state.pets,
        client.sessionId,
      );

      client.send(
        'pets-state-sync',
        ResponseBuilder.petsStateSync(updatedPets),
      );

      console.log(
        `📤 Sent pets-state-sync with ${updatedPets.length} pets to ${player.name}`,
      );
    } else {
      console.log(
        `🔄 Returning player ${player.name} has ${existingPets.length} existing pets`,
      );
    }
  }

  private sendWelcomeMessage(client: Client, player: Player) {
    // Send welcome message
    client.send(
      'welcome',
      ResponseBuilder.welcomeMessage(
        player.name,
        this.roomId,
        this.state.roomName,
      ),
    );
  }

  onLeave(client: Client, consented?: boolean) {
    console.log(`👋 Player left: ${client.sessionId}, consented: ${consented}`);
    this.allowReconnection(client, GAME_CONFIG.ROOM.RECONNECTION_TIME);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Save player data before removing
      PlayerService.savePlayerData(player);

      // Remove all pets owned by this player
      const petIdsToRemove = this.removePlayerPets(
        client.sessionId,
        player.name,
      );

      // Remove player immediately (no reconnection for simplicity)
      this.state.players.delete(client.sessionId);
      this.state.playerCount = this.state.players.size;

      this.loggingService.logPlayerLeft(
        player,
        petIdsToRemove.length,
        consented,
      );

      console.log(
        `🗑️ ${player.name} removed with ${petIdsToRemove.length} pets. Remaining players: ${this.state.playerCount}`,
      );
    }
  }

  private removePlayerPets(sessionId: string, playerName: string): string[] {
    const petIdsToRemove: string[] = [];

    this.state.pets.forEach((pet, petId) => {
      if (pet.ownerId === sessionId) {
        petIdsToRemove.push(petId);
      }
    });

    // Remove pets and log removal
    petIdsToRemove.forEach((petId) => {
      this.state.pets.delete(petId);

      this.loggingService.logStateChange('PET_REMOVED', {
        petId,
        ownerId: sessionId,
        ownerName: playerName,
        reason: 'owner_left',
      });

      console.log(`🗑️ Pet ${petId} removed (owner ${playerName} left)`);
    });

    return petIdsToRemove;
  }

  onDispose() {
    this.loggingService.logRoomDisposed();
  }
}
