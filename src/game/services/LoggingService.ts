import { Room } from 'colyseus';
import { GameRoomState } from '../schemas/game-room.schema';

export class LoggingService {
  private room: Room<GameRoomState>;
  private lastStateSummary: number = 0;

  constructor(room: Room<GameRoomState>) {
    this.room = room;
  }

  logStateChange(action: string, details: any) {
    console.log(`🔄 [STATE CHANGE] ${action}:`, {
      timestamp: new Date().toISOString(),
      roomId: this.room.roomId,
      playerCount: this.room.state.playerCount,
      petCount: this.room.state.pets.size,
      droppedFoodCount: this.room.state.droppedFood.size,
      details,
    });
  }

  logCurrentState() {
    console.log(`📊 [CURRENT STATE] Room ${this.room.roomId}:`, {
      timestamp: new Date().toISOString(),
      roomName: this.room.state.roomName,
      isActive: this.room.state.isActive,
      playerCount: this.room.state.playerCount,
      players: Array.from(this.room.state.players.entries()).map(
        ([id, player]) => ({
          sessionId: id,
          name: player.name,
          tokens: player.tokens,
          isOnline: player.isOnline,
          foodInventoryCount: player.foodInventory.size,
        }),
      ),
      pets: Array.from(this.room.state.pets.entries()).map(([id, pet]) => ({
        id,
        ownerId: pet.ownerId,
        x: pet.x,
        y: pet.y,
        hungerLevel: pet.hungerLevel,
        currentActivity: pet.currentActivity,
        isChasing: pet.isChasing,
        lastFedAt: pet.lastFedAt,
      })),
      droppedFood: Array.from(this.room.state.droppedFood.entries()).map(
        ([id, food]) => ({
          id,
          foodType: food.foodType,
          x: food.x,
          y: food.y,
          quantity: food.quantity,
          droppedBy: food.droppedBy,
          droppedAt: food.droppedAt,
        }),
      ),
    });
  }

  logRoomCreated() {
    console.log('🎮 Pet Simulator Room Created:', this.room.roomId);
    console.log('✅ Pet Simulator Room initialized successfully');

    this.logStateChange('ROOM_CREATED', {
      roomId: this.room.roomId,
      roomName: this.room.state.roomName,
      maxClients: (this.room as any).maxClients,
    });

    this.logCurrentState();
  }

  periodicStateSummary() {
    const now = Date.now();
    if (!this.lastStateSummary || now - this.lastStateSummary > 30000) {
      console.log(`⏰ [PERIODIC STATE SUMMARY] ${new Date().toISOString()}`);
      this.logCurrentState();
      this.lastStateSummary = now;
    }
  }

  logPlayerJoined(player: any) {
    this.logStateChange('PLAYER_JOINED', {
      sessionId: player.sessionId,
      playerName: player.name,
      totalPlayers: this.room.state.playerCount,
      starterTokens: player.tokens,
      starterFood: player.foodInventory.size,
    });

    this.logCurrentState();
  }

  logPlayerLeft(player: any, petsRemoved: number, consented?: boolean) {
    this.logStateChange('PLAYER_LEFT', {
      sessionId: player.sessionId,
      playerName: player.name,
      totalPlayers: this.room.state.playerCount,
      petsRemoved,
      consented,
    });

    this.logCurrentState();
  }

  logRoomDisposed() {
    console.log(`🗑️ Game Room disposed: ${this.room.roomId}`);
    this.room.state.isActive = false;

    this.logStateChange('ROOM_DISPOSED', {
      roomId: this.room.roomId,
      finalPlayerCount: this.room.state.playerCount,
      finalPetCount: this.room.state.pets.size,
      finalDroppedFoodCount: this.room.state.droppedFood.size,
    });

    console.log(`📊 [FINAL STATE] Room ${this.room.roomId} before disposal:`);
    this.logCurrentState();
  }
}
