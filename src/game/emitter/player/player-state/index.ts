import { Client, Room } from 'colyseus'
import { ResponseBuilder } from '../../../utils/ResponseBuilder'
import { PetService } from 'src/game/handlers/PetService'
import { InventoryService } from 'src/game/handlers/InventoryService'
import { GameRoomState } from 'src/game/schemas/game-room.schema'

// Interface for room with logging service
interface RoomWithLogging extends Room<GameRoomState> {
  loggingService?: {
    logStateChange: (event: string, data: any) => void
  }
}

// Player State Request Module
export const requestPlayerState = (room: RoomWithLogging) => {
  return (client: Client) => {
    console.log(`👤 Player state requested by ${client.sessionId}`)

    const player = room.state.players.get(client.sessionId)
    if (!player) {
      client.send('player-state-sync', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    try {
      // Send current player state to client
      client.send('player-state-sync', ResponseBuilder.playerStateSync(player))

      // Also send pets state for this player
      const playerPets = PetService.getPlayerPets(player)
      client.send('pets-state-sync', ResponseBuilder.petsStateSync(playerPets))

      // Send inventory state
      const inventory = InventoryService.getInventorySummary(player) as { totalItems: number }
      client.send('inventory-sync', {
        success: true,
        inventory,
        tokens: player.tokens
      })

      // Log state change if logging service exists
      if (room.loggingService && typeof room.loggingService.logStateChange === 'function') {
        room.loggingService.logStateChange('PLAYER_STATE_REQUESTED', {
          playerId: client.sessionId,
          playerName: player.name,
          tokens: player.tokens,
          petCount: playerPets.length,
          inventoryItems: inventory.totalItems
        })
      }

      console.log(`✅ Player state sent to ${player.name}: ${playerPets.length} pets, ${inventory.totalItems} items`)
    } catch (error) {
      console.error('❌ Error sending player state:', error)
      client.send('player-state-sync', {
        success: false,
        message: 'Failed to get player state'
      })
    }
  }
}
