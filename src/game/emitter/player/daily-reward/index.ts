import { Client } from 'colyseus'
import { InventoryService } from 'src/game/handlers/InventoryService'
import { PlayerService } from 'src/game/handlers/PlayerService'
import { GameRoom } from 'src/game/rooms/game.room'
import { Player } from 'src/game/schemas/game-room.schema'

// Daily Reward Module
export const claimDailyReward = (room: GameRoom) => {
  return async (client: Client) => {
    const player: Player | undefined = room.state.players.get(client.sessionId)
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
          { type: 'food', id: 'apple', name: 'apple', quantity: 3 },
          { type: 'food', id: 'fish', name: 'fish', quantity: 1 }
        ]
      }

      // Add token rewards
      await PlayerService.addTokens(player, dailyRewards.tokens)

      // Add item rewards
      for (const item of dailyRewards.items) {
        InventoryService.addItem(player, item.type, item.id, item.name, item.quantity)
      }

      const newInventory = InventoryService.getInventorySummary(player)

      client.send('daily-reward-response', {
        success: true,
        rewards: dailyRewards,
        newBalance: {
          tokens: player.tokens,
          inventory: newInventory
        },
        message: `Daily reward claimed! +${dailyRewards.tokens} tokens and items`
      })

      room.loggingService.logStateChange('DAILY_REWARD_CLAIMED', {
        playerId: client.sessionId,
        playerName: player.name,
        tokensEarned: dailyRewards.tokens,
        itemsEarned: dailyRewards.items.length
      })

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
