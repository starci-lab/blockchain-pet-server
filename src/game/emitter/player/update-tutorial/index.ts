import { Client } from 'colyseus'
import { InventoryService } from 'src/game/handlers/InventoryService'
import { PlayerService } from 'src/game/handlers/PlayerService'
import { GameRoom } from 'src/game/rooms/game.room'
import { Player } from 'src/game/schemas/game-room.schema'

// Define interfaces for type safety
interface TutorialItem {
  type: string
  id: string
  name: string
  quantity: number
}

interface TutorialReward {
  tokens?: number
  items?: TutorialItem[]
}

interface TutorialRewards {
  [key: string]: TutorialReward
}

// Update Tutorial Progress Handler
export const updateTutorial = (room: GameRoom) => {
  return async (
    client: Client,
    data: {
      step: string
      completed: boolean
      progress?: any
    }
  ) => {
    try {
      const player: Player | undefined = room.state.players.get(client.sessionId)
      if (!player) {
        client.send('tutorial-response', {
          success: false,
          message: 'Player not found'
        })
        return
      }

      console.log(`🎓 Tutorial update for ${player.name}:`, data)

      // Here you could track tutorial progress in player data
      // For now, just acknowledge the update

      // Give tutorial rewards
      if (data.completed) {
        const tutorialRewards: TutorialRewards = {
          'first-pet': {
            tokens: 10,
            items: [{ type: 'food', id: 'apple', name: 'apple', quantity: 5 }]
          },
          'feed-pet': {
            tokens: 5,
            items: [{ type: 'food', id: 'fish', name: 'fish', quantity: 2 }]
          },
          'buy-item': {
            tokens: 15,
            items: [{ type: 'toys', id: 'ball', name: 'ball', quantity: 1 }]
          }
        }

        const reward: TutorialReward | undefined = tutorialRewards[data.step]
        if (reward) {
          // Give token reward
          if (reward.tokens) {
            await PlayerService.addTokens(player, reward.tokens)
          }

          // Give item rewards
          if (reward.items) {
            for (const item of reward.items) {
              InventoryService.addItem(player, item.type, item.id, item.name, item.quantity)
            }
          }

          console.log(`🎁 Tutorial reward given for step: ${data.step}`)
        }
      }

      // Send response
      client.send('tutorial-response', {
        success: true,
        step: data.step,
        completed: data.completed,
        tokens: player.tokens,
        inventory: InventoryService.getInventorySummary(player)
      })

      room.loggingService.logStateChange('TUTORIAL_PROGRESS', {
        playerId: client.sessionId,
        playerName: player.name,
        step: data.step,
        completed: data.completed
      })
    } catch (error) {
      console.error('❌ Error updating tutorial:', error)
      client.send('tutorial-response', {
        success: false,
        message: 'Failed to update tutorial progress'
      })
    }
  }
}
