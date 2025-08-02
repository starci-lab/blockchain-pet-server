import { Client, Room } from 'colyseus'
import { PlayerService } from 'src/game/handlers/PlayerService'
import { GameRoomState } from 'src/game/schemas/game-room.schema'

// Interface for room with logging service
interface RoomWithLogging extends Room<GameRoomState> {
  loggingService?: {
    logStateChange: (event: string, data: any) => void
  }
}

// Interface for update settings data
interface UpdateSettingsData {
  name?: string
  preferences?: Record<string, any>
}

// Player Settings Update Handler
export const updatePlayerSettings = (room: RoomWithLogging) => {
  return async (client: Client, data: UpdateSettingsData) => {
    try {
      const player = room.state.players.get(client.sessionId)
      if (!player) {
        client.send('update-settings-response', {
          success: false,
          message: 'Player not found'
        })
        return
      }

      console.log(`⚙️ Updating settings for ${player.name}:`, data)

      // Update player name if provided
      if (data.name && data.name.trim() !== '') {
        const oldName = player.name
        player.name = data.name.trim()
        console.log(`📝 Player name changed: ${oldName} -> ${player.name}`)
      }

      // Save updated player data
      await PlayerService.savePlayerData(player)

      // Send response
      client.send('update-settings-response', {
        success: true,
        message: 'Settings updated successfully',
        player: {
          name: player.name,
          tokens: player.tokens,
          totalPetsOwned: player.totalPetsOwned
        }
      })

      // Log state change if logging service exists
      if (room.loggingService && typeof room.loggingService.logStateChange === 'function') {
        room.loggingService.logStateChange('PLAYER_SETTINGS_UPDATED', {
          playerId: client.sessionId,
          playerName: player.name,
          changes: data
        })
      }
    } catch (error) {
      console.error('❌ Error updating player settings:', error)
      client.send('update-settings-response', {
        success: false,
        message: 'Failed to update settings'
      })
    }
  }
}
