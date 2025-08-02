import { Client, Room } from 'colyseus'
import { eventBus } from 'src/shared/even-bus'
import { GameRoomState } from 'src/game/schemas/game-room.schema'

// Interface for room with logging service
interface RoomWithLogging extends Room<GameRoomState> {
  loggingService?: {
    logStateChange: (event: string, data: any) => void
  }
}

// Interface for settings data
interface SettingsData {
  name?: string
  preferences?: Record<string, any>
}

// Interface for tutorial data
interface TutorialData {
  step?: string
  completed?: boolean
  progress?: Record<string, any>
}

// Interface for pets request data
interface PetsRequestData {
  petId?: string
  action?: string
  data?: Record<string, any>
}

export class PlayerEmitter {
  // Game config handler - emit to PlayerService
  static requestGameConfig(room: RoomWithLogging) {
    return (client: Client) => {
      console.log(`⚙️ [Handler] Request game config`)

      eventBus.emit('player.get_game_config', {
        sessionId: client.sessionId,
        room,
        client
      } as const)
    }
  }

  // Player state handler - emit to PlayerService
  static requestPlayerState(room: RoomWithLogging) {
    return (client: Client) => {
      console.log(`👤 [Handler] Request player state`)

      eventBus.emit('player.get_state', {
        sessionId: client.sessionId,
        room,
        client
      } as const)
    }
  }

  // Profile handler - emit to PlayerService
  static getProfile(room: RoomWithLogging) {
    return (client: Client) => {
      console.log(`📋 [Handler] Get profile request`)

      eventBus.emit('player.get_profile', {
        sessionId: client.sessionId,
        room,
        client
      } as const)
    }
  }

  // Daily reward handler - emit to PlayerService
  static claimDailyReward(room: RoomWithLogging) {
    return (client: Client) => {
      console.log(`🎁 [Handler] Claim daily reward`)

      eventBus.emit('player.claim_daily_reward', {
        sessionId: client.sessionId,
        room,
        client
      } as const)
    }
  }

  // Settings update handler - emit to PlayerService
  static updateSettings(room: RoomWithLogging) {
    return (client: Client, data: SettingsData) => {
      console.log(`⚙️ [Handler] Update settings:`, data)

      eventBus.emit('player.update_settings', {
        sessionId: client.sessionId,
        settings: data,
        room,
        client
      } as const)
    }
  }

  // Tutorial update handler - emit to PlayerService
  static updateTutorial(room: RoomWithLogging) {
    return (client: Client, data: TutorialData) => {
      console.log(`📚 [Handler] Update tutorial:`, data)

      eventBus.emit('player.update_tutorial', {
        sessionId: client.sessionId,
        tutorialData: data,
        room,
        client
      } as const)
    }
  }

  // Request pets state handler - emit to PlayerService or PetService
  static requestPetsState(room: RoomWithLogging) {
    return (client: Client, data: PetsRequestData) => {
      console.log(`🐕 [Emitter] Request pets state from ${client.sessionId}`)

      eventBus.emit('player.get_pets_state', {
        sessionId: client.sessionId,
        room,
        client,
        data
      } as const)
    }
  }

  // Helper methods for validation (can be used by services)
  static validatePlayer(room: RoomWithLogging, sessionId: string): any {
    const player = room.state.players.get(sessionId)
    if (!player) {
      console.warn(`⚠️ Player not found for session: ${sessionId}`)
      return null
    }
    return player
  }

  static sendPlayerError(client: Client, action: string, message: string = 'Player not found') {
    client.send(`${action}-response`, {
      success: false,
      message
    })
  }

  static logPlayerAction(room: RoomWithLogging, action: string, playerId: string, data: Record<string, any> = {}) {
    room.loggingService?.logStateChange(action, {
      playerId,
      timestamp: new Date().toISOString(),
      ...data
    })
  }
}
