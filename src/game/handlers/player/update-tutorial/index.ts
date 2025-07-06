import { Client } from 'colyseus';
import { PlayerService } from '../../../services/PlayerService';
import { InventoryService } from '../../../services/InventoryService';

// Update Tutorial Progress Handler
export const updateTutorial = (room: any) => {
  return async (
    client: Client,
    data: {
      step: string;
      completed: boolean;
      progress?: any;
    },
  ) => {
    try {
      const player = room.state.players.get(client.sessionId);
      if (!player) {
        client.send('tutorial-response', {
          success: false,
          message: 'Player not found',
        });
        return;
      }

      console.log(`🎓 Tutorial update for ${player.name}:`, data);

      // Here you could track tutorial progress in player data
      // For now, just acknowledge the update

      // Give tutorial rewards
      if (data.completed) {
        const tutorialRewards = {
          'first-pet': {
            tokens: 10,
            items: [{ type: 'food', name: 'apple', quantity: 5 }],
          },
          'feed-pet': {
            tokens: 5,
            items: [{ type: 'food', name: 'fish', quantity: 2 }],
          },
          'buy-item': {
            tokens: 15,
            items: [{ type: 'toys', name: 'ball', quantity: 1 }],
          },
        };

        const reward = (tutorialRewards as any)[data.step];
        if (reward) {
          // Give token reward
          if (reward.tokens) {
            PlayerService.addTokens(player, reward.tokens);
          }

          // Give item rewards
          if (reward.items) {
            reward.items.forEach((item: any) => {
              InventoryService.addItem(
                player,
                item.type,
                item.name,
                item.quantity,
              );
            });
          }

          console.log(`🎁 Tutorial reward given for step: ${data.step}`);
        }
      }

      // Send response
      client.send('tutorial-response', {
        success: true,
        step: data.step,
        completed: data.completed,
        tokens: player.tokens,
        inventory: InventoryService.getInventorySummary(player),
      });

      room.loggingService.logStateChange('TUTORIAL_PROGRESS', {
        playerId: client.sessionId,
        playerName: player.name,
        step: data.step,
        completed: data.completed,
      });
    } catch (error) {
      console.error('❌ Error updating tutorial:', error);
      client.send('tutorial-response', {
        success: false,
        message: 'Failed to update tutorial progress',
      });
    }
  };
};
