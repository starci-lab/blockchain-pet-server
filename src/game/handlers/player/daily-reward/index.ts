import { Client } from 'colyseus';
import { PlayerService } from '../../../services/PlayerService';
import { InventoryService } from '../../../services/InventoryService';

// Daily Reward Module
export const claimDailyReward = (room: any) => {
  return (client: Client) => {
    const player = room.state.players.get(client.sessionId);
    if (!player) {
      client.send('daily-reward-response', {
        success: false,
        message: 'Player not found',
      });
      return;
    }

    try {
      // Simple daily reward logic (you can enhance this with cooldown tracking)
      const dailyRewards = {
        tokens: 50,
        items: [
          { type: 'food', name: 'apple', quantity: 3 },
          { type: 'food', name: 'fish', quantity: 1 },
        ],
      };

      // Add token rewards
      PlayerService.addTokens(player, dailyRewards.tokens);

      // Add item rewards
      dailyRewards.items.forEach((item) => {
        InventoryService.addItem(player, item.type, item.name, item.quantity);
      });

      const newInventory = InventoryService.getInventorySummary(player);

      client.send('daily-reward-response', {
        success: true,
        rewards: dailyRewards,
        newBalance: {
          tokens: player.tokens,
          inventory: newInventory,
        },
        message: `Daily reward claimed! +${dailyRewards.tokens} tokens and items`,
      });

      room.loggingService.logStateChange('DAILY_REWARD_CLAIMED', {
        playerId: client.sessionId,
        playerName: player.name,
        tokensEarned: dailyRewards.tokens,
        itemsEarned: dailyRewards.items.length,
      });

      console.log(
        `🎁 Daily reward claimed by ${player.name}: ${dailyRewards.tokens} tokens + ${dailyRewards.items.length} items`,
      );
    } catch (error) {
      console.error('❌ Error claiming daily reward:', error);
      client.send('daily-reward-response', {
        success: false,
        message: 'Failed to claim daily reward',
      });
    }
  };
};
