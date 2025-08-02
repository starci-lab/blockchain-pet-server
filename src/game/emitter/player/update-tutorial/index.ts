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

// Interface for tutorial data
interface TutorialData {
  step: string
  completed: boolean
  progress?: Record<string, any>
}

// Interface for tutorial item reward
interface TutorialItem {
  type: string
  name: string
  quantity: number
}

// Interface for tutorial reward
interface TutorialReward {
  tokens?: number
  items?: TutorialItem[]
}

// Type for tutorial rewards mapping
type TutorialRewards = Record<string, TutorialReward>

// Update Tutorial Progress Handler
export const updateTutorial = (room: RoomWithLogging) => {
  return async (client: Client, data: TutorialData) => {
    try {
      const player = room.state.players.get(client.sessionId)
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
            items: [{ type: 'food', name: 'apple', quantity: 5 }]
          },
          'feed-pet': {
            tokens: 5,
            items: [{ type: 'food', name: 'fish', quantity: 2 }]
          },
          'buy-item': {
            tokens: 15,
            items: [{ type: 'toys', name: 'ball', quantity: 1 }]
          }
        }

        const reward = tutorialRewards[data.step]
        if (reward) {
          // Give token reward
          if (reward.tokens) {
            await PlayerService.addTokens(player, reward.tokens)
          }

          // Give item rewards
          if (reward.items) {
            reward.items.forEach((item: TutorialItem) => {
              InventoryService.addItem(player, item.type, item.name, item.quantity)
            })
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
        inventory: InventoryService.getInventorySummary(player) as Record<string, any>
      })

      // Log state change if logging service exists
      if (room.loggingService && typeof room.loggingService.logStateChange === 'function') {
        room.loggingService.logStateChange('TUTORIAL_PROGRESS', {
          playerId: client.sessionId,
          playerName: player.name,
          step: data.step,
          completed: data.completed
        })
      }
    } catch (error) {
      console.error('❌ Error updating tutorial:', error)
      client.send('tutorial-response', {
        success: false,
        message: 'Failed to update tutorial progress'
      })
    }
  }
}
