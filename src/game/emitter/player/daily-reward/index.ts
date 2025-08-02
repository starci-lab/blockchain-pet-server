import { Client, Room } from 'colyseus'
import { InventoryService } from 'src/game/handlers/InventoryService'
import { PlayerService } from 'src/game/handlers/PlayerService'
import { GameRoomState } from 'src/game/schemas/game-room.schema'

// Interface for room with logging service
interface RoomWithLogging extends Room<GameRoomState> {
  loggingService?: {
    logStateChange: (event: string, data: any) => void
  }
}

// Daily Reward Module
export const claimDailyReward = (room: RoomWithLogging) => {
  return async (client: Client) => {
    const player = room.state.players.get(client.sessionId)
    if (!player) {
      client.send('daily-reward-response', {
        success: false,
        message: 'Player not found'
      })
      return
    }

    try {
      const dailyRewards = {
        tokens: 50,
        items: [
          { type: 'food', name: 'apple', quantity: 3 },
          { type: 'food', name: 'fish', quantity: 1 }
        ]
      }

      // Add token rewards
      await PlayerService.addTokens(player, dailyRewards.tokens)

      // Add item rewards
      dailyRewards.items.forEach((item) => {
        InventoryService.addItem(player, item.type, item.name, item.quantity)
      })

      const newInventory = InventoryService.getInventorySummary(player) as Record<string, any>

      client.send('daily-reward-response', {
        success: true,
        rewards: dailyRewards,
        newBalance: {
          tokens: player.tokens,
          inventory: newInventory
        },
        message: `Daily reward claimed! +${dailyRewards.tokens} tokens and items`
      })

      // Log state change if logging service exists
      if (room.loggingService && typeof room.loggingService.logStateChange === 'function') {
        room.loggingService.logStateChange('DAILY_REWARD_CLAIMED', {
          playerId: client.sessionId,
          playerName: player.name,
          tokensEarned: dailyRewards.tokens,
          itemsEarned: dailyRewards.items.length
        })
      }

      console.log(
        `🎁 Daily reward claimed by ${player.name}: ${dailyRewards.tokens} tokens + ${dailyRewards.items.length} items`
      )
    } catch (error) {
      console.error('❌ Error claiming daily reward:', error)
      client.send('daily-reward-response', {
        success: false,
        message: 'Failed to claim daily reward'
      })
    }
  }
}
