import { Client } from 'colyseus'
import { ResponseBuilder } from '../../../utils/ResponseBuilder'
import { PetService } from 'src/game/handlers/PetService'
import { InventoryService } from 'src/game/handlers/InventoryService'
import { GameRoom } from 'src/game/rooms/game.room'
import { MESSAGE_EMMITERS_COLYSEUS } from 'src/game/constants/message-colyseus'

// Player State Request Module
export const requestPlayerState = (room: GameRoom) => {
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
      client.send(MESSAGE_EMMITERS_COLYSEUS.PET.STATE_SYNC, ResponseBuilder.petsStateSync(playerPets))

      // Send inventory state
      const inventory = InventoryService.getInventorySummary(player)
      client.send('inventory-sync', {
        success: true,
        inventory,
        tokens: player.tokens
      })

      room.loggingService.logStateChange('PLAYER_STATE_REQUESTED', {
        playerId: client.sessionId,
        playerName: player.name,
        tokens: player.tokens,
        petCount: playerPets.length,
        inventoryItems: inventory.totalItems
      })

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
