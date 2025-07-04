import { Room, Client } from 'colyseus';
import {
  GameRoomState,
  Player,
  Pet,
  FoodItem,
} from '../schemas/game-room.schema';
import { PetHandlers } from '../handlers/PetHandlers';
import { FoodHandlers } from '../handlers/FoodHandlers';
import { PlayerHandlers } from '../handlers/PlayerHandlers';
import { PlayerService } from '../services/PlayerService';
import { PetService } from '../services/PetService';
import { LoggingService } from '../services/LoggingService';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { GAME_CONFIG } from '../config/GameConfig';

export class GameRoom extends Room<GameRoomState> {
  maxClients = GAME_CONFIG.ROOM.MAX_CLIENTS; // Single player only
  public loggingService: LoggingService;

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
    this.onMessage('pet-activity', PetHandlers.updateActivity(this));
    this.onMessage('pet-chase', PetHandlers.handleChase(this));
    this.onMessage('remove-pet', PetHandlers.removePet(this));

    // Food handlers
    this.onMessage('food-purchase', FoodHandlers.purchaseFood(this));
    this.onMessage('food-drop', FoodHandlers.dropFood(this));
    this.onMessage('pet-feed', FoodHandlers.feedPet(this));

    // Player handlers
    this.onMessage(
      'request-game-config',
      PlayerHandlers.requestGameConfig(this),
    );
    this.onMessage(
      'request-player-state',
      PlayerHandlers.requestPlayerState(this),
    );

    console.log('✅ Message handlers setup complete');
  }

  private updateGameLogic() {
    // Update pet hunger levels using service
    PetService.updateHungerLevels(this.state.pets);

    // Log periodic state summary
    this.loggingService.periodicStateSummary();
  }

  onJoin(client: Client, options: any) {
    console.log(`👋 Player joined: ${client.sessionId}`);

    // Create new player using service
    const player = PlayerService.createNewPlayer(
      client.sessionId,
      options?.name,
    );

    // Add to room state
    this.state.players.set(client.sessionId, player);
    this.state.playerCount = this.state.players.size;

    this.handleNewPlayerPets(client, player);
    this.loggingService.logPlayerJoined(player);
    this.sendWelcomeMessage(client, player);

    console.log(
      `✅ ${player.name} joined successfully. Total players: ${this.state.playerCount}`,
    );
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
