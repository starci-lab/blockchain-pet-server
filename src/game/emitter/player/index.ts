import { Client } from 'colyseus'
import { GameRoom } from 'src/game/rooms/game.room'
import { Player } from 'src/game/schemas/game-room.schema'
import { eventBus } from 'src/shared/even-bus'

// Define specific interfaces for better type safety
interface PlayerSettingsData {
  name?: string
  preferences?: Record<string, any>
}

interface TutorialData {
  step: string
  completed: boolean
  progress?: Record<string, any>
}

// interface PetsStateData {
//   petId?: string
//   action?: string
//   filters?: Record<string, any>
// }

export class PlayerEmitter {
  // Game config handler - emit to PlayerService
  static requestGameConfig(room: GameRoom) {
    return (client: Client) => {
      console.log(`⚙️ [Handler] Request game config`)

      eventBus.emit('player.get_game_config', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Player state handler - emit to PlayerService
  static requestPlayerState(room: GameRoom) {
    return (client: Client) => {
      console.log(`👤 [Handler] Request player state`)

      eventBus.emit('player.get_state', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Profile handler - emit to PlayerService
  static getProfile(room: GameRoom) {
    return (client: Client) => {
      console.log(`📋 [Handler] Get profile request`)

      eventBus.emit('player.get_profile', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Daily reward handler - emit to PlayerService
  static claimDailyReward(room: GameRoom) {
    return (client: Client) => {
      console.log(`🎁 [Handler] Claim daily reward`)

      eventBus.emit('player.claim_daily_reward', {
        sessionId: client.sessionId,
        room,
        client
      })
    }
  }

  // Settings update handler - emit to PlayerService
  static updateSettings(room: GameRoom) {
    return (client: Client, data: PlayerSettingsData) => {
      console.log(`⚙️ [Handler] Update settings:`, data)

      eventBus.emit('player.update_settings', {
        sessionId: client.sessionId,
        settings: data,
        room,
        client
      })
    }
  }

  // Tutorial update handler - emit to PlayerService
  static updateTutorial(room: GameRoom) {
    return (client: Client, data: TutorialData) => {
      console.log(`📚 [Handler] Update tutorial:`, data)

      eventBus.emit('player.update_tutorial', {
        sessionId: client.sessionId,
        tutorialData: data,
        room,
        client
      })
    }
  }

  // Request pets state handler - emit to PlayerService or PetService
  static requestPetsState(room: GameRoom) {
    return (client: Client, data: unknown) => {
      console.log(`🐕 [Emitter] Request pets state from ${client.sessionId}`)

      eventBus.emit('player.get_pets_state', {
        sessionId: client.sessionId,
        room,
        client,
        data
      })
    }
  }

  // Helper methods for validation (can be used by services)
  static validatePlayer(room: GameRoom, sessionId: string): Player | null {
    const player: Player | undefined = room.state.players.get(sessionId)
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

  static logPlayerAction(
    room: GameRoom,
    action: string,
    playerId: string,
    data: Record<string, string | number | boolean> = {}
  ) {
    room.loggingService?.logStateChange(action, {
      playerId,
      timestamp: new Date().toISOString(),
      ...data
    })
  }
}
