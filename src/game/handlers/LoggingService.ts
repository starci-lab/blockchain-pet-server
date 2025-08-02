import { Room } from 'colyseus'
import { GameRoomState } from '../schemas/game-room.schema'
import { LoggingDetails, GamePlayer } from '../types/GameTypes'

export class LoggingService {
  private room: Room<GameRoomState>
  private lastStateSummary: number = 0

  constructor(room: Room<GameRoomState>) {
    this.room = room
  }

  logStateChange(action: string, details: LoggingDetails) {
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
        lastUpdated: pet.lastUpdated,
        lastUpdateHappiness: pet.lastUpdateHappiness,
        lastUpdateHunger: pet.lastUpdateHunger,
        lastUpdateCleanliness: pet.lastUpdateCleanliness,
        isAdult: pet.isAdult,
        tokenIncome: pet.tokenIncome,
        totalIncome: pet.totalIncome,
        lastClaim: pet.lastClaim
      }))
    })
  }

  logRoomCreated() {
    console.log('🎮 Pet Simulator Room Created:', this.room.roomId)
    console.log('✅ Pet Simulator Room initialized successfully')

    this.logStateChange('ROOM_CREATED', {
      roomId: this.room.roomId,
      roomName: this.room.state.roomName,
      maxClients: (this.room as unknown as { maxClients: number }).maxClients
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

  logPlayerJoined(player: GamePlayer) {
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

  logPlayerLeft(player: GamePlayer, petsRemoved: number, consented?: boolean) {
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
