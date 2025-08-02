import { Client, Room } from 'colyseus'
import { InventoryService } from 'src/game/handlers/InventoryService'
import { PetService } from 'src/game/handlers/PetService'
import { GameRoomState } from 'src/game/schemas/game-room.schema'

// Interface for inventory summary
interface InventorySummary {
  totalItems: number
  itemsByType: {
    food?: number
    toys?: number
    cleaning?: number
    [key: string]: number | undefined
  }
}

// Interface for pet stats summary
interface PetStatsSummary {
  id: string
  petType: string
  hunger: number
  happiness: number
  cleanliness: number
  [key: string]: any
}

// Player Profile Module
export const getProfile = (room: Room<GameRoomState>) => {
  return (client: Client) => {
    const player = room.state.players.get(client.sessionId)
    if (!player) {
      client.send('profile-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    try {
      const playerPets = PetService.getPlayerPets(player)
      const inventory = InventoryService.getInventorySummary(player) as InventorySummary

      const profile = {
        name: player.name,
        tokens: player.tokens,
        totalPetsOwned: player.totalPetsOwned,
        joinedAt: player.joinedAt,
        pets: playerPets.map((pet) => PetService.getPetStatsSummary(pet) as PetStatsSummary),
        inventory: inventory,
        stats: {
          activePets: playerPets.length,
          totalItems: inventory.totalItems,
          foodItems: inventory.itemsByType.food || 0,
          toyItems: inventory.itemsByType.toys || 0,
          cleaningItems: inventory.itemsByType.cleaning || 0
        }
      }

      client.send('profile-response', {
        success: true,
        profile
      })

      console.log(`👤 Profile sent to ${player.name}: ${playerPets.length} pets, ${inventory.totalItems} items`)
    } catch (error) {
      console.error('❌ Error getting profile:', error)
      client.send('profile-response', {
        success: false,
        message: 'Failed to get profile'
      })
    }
  }
}
