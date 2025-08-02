import { Room } from 'colyseus'
import { GameRoomState, Player } from '../schemas/game-room.schema'

// Interface for room with maxClients property
interface RoomWithMaxClients extends Room<GameRoomState> {
  maxClients: number
}

// Interface for log details
interface LogDetails {
  [key: string]: unknown
}

export class LoggingService {
  private room: RoomWithMaxClients
  private lastStateSummary: number = 0

  constructor(room: RoomWithMaxClients) {
    this.room = room
  }

  logStateChange(action: string, details: LogDetails) {
    console.log(`🔄 [STATE CHANGE] ${action}:`, {
      timestamp: new Date().toISOString(),
      roomId: this.room.roomId,
      playerCount: this.room.state.playerCount,
      petCount: this.room.state.pets.size,
      details
    })
  }

  logCurrentState() {
    console.log(`📊 [CURRENT STATE] Room ${this.room.roomId}:`, {
      timestamp: new Date().toISOString(),
      roomName: this.room.state.roomName,
      playerCount: this.room.state.playerCount,
      players: Array.from(this.room.state.players.entries()).map(([id, player]) => ({
        sessionId: id,
        name: player.name,
        tokens: player.tokens
      })),
      pets: Array.from(this.room.state.pets.entries()).map(([id, pet]) => ({
        id,
        ownerId: pet.ownerId,
        petType: pet.petType,
        hunger: pet.hunger,
        happiness: pet.happiness,
        cleanliness: pet.cleanliness,
        lastUpdated: pet.lastUpdated
      }))
    })
  }

  logRoomCreated() {
    console.log('🎮 Pet Simulator Room Created:', this.room.roomId)
    console.log('✅ Pet Simulator Room initialized successfully')

    this.logStateChange('ROOM_CREATED', {
      roomId: this.room.roomId,
      roomName: this.room.state.roomName,
      maxClients: this.room.maxClients || 'unknown'
    })

    this.logCurrentState()
  }

  periodicStateSummary() {
    const now = Date.now()
    if (!this.lastStateSummary || now - this.lastStateSummary > 30000) {
      console.log(`⏰ [PERIODIC STATE SUMMARY] ${new Date().toISOString()}`)
      this.logCurrentState()
      this.lastStateSummary = now
    }
  }

  logPlayerJoined(player: Player) {
    this.logStateChange('PLAYER_JOINED', {
      sessionId: player.sessionId,
      playerName: player.name,
      totalPlayers: this.room.state.playerCount,
      starterTokens: player.tokens,
      totalPetsOwned: player.totalPetsOwned,
      inventoryItems: player.inventory.size
    })

    this.logCurrentState()
  }

  logPlayerLeft(player: Player, petsRemoved: number, consented?: boolean) {
    this.logStateChange('PLAYER_LEFT', {
      sessionId: player.sessionId,
      playerName: player.name,
      totalPlayers: this.room.state.playerCount,
      petsRemoved,
      consented
    })

    this.logCurrentState()
  }

  logRoomDisposed() {
    console.log(`🗑️ Game Room disposed: ${this.room.roomId}`)

    this.logStateChange('ROOM_DISPOSED', {
      roomId: this.room.roomId,
      finalPlayerCount: this.room.state.playerCount,
      finalPetCount: this.room.state.pets.size
    })

    console.log(`📊 [FINAL STATE] Room ${this.room.roomId} before disposal:`)
    this.logCurrentState()
  }
}
