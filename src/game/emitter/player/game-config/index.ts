import { Client } from 'colyseus';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';

// Game Config Handler
export const requestGameConfig = (room: any) => {
  return (client: Client) => {
    console.log(`⚙️ Game config requested by ${client.sessionId}`);

    try {
      const gameConfig = {
        version: '1.0.0',
        gameSettings: {
          maxPets: 5,
          feedCooldown: 30000, // 30 seconds
          maxHunger: 100,
          maxHappiness: 100,
          maxCleanliness: 100,
          hungerDecayRate: 1, // per minute
          happinessDecayRate: 0.5,
          cleanlinessDecayRate: 0.3,
        },
        shop: {
          items: [
            { id: 'apple', type: 'food', name: 'Apple', price: 5, hunger: 20 },
            { id: 'fish', type: 'food', name: 'Fish', price: 10, hunger: 35 },
            { id: 'meat', type: 'food', name: 'Meat', price: 15, hunger: 50 },
            { id: 'ball', type: 'toy', name: 'Ball', price: 20, happiness: 25 },
            {
              id: 'soap',
              type: 'cleaning',
              name: 'Soap',
              price: 8,
              cleanliness: 30,
            },
          ],
        },
        dailyRewards: {
          tokens: 50,
          items: [{ type: 'food', name: 'apple', quantity: 3 }],
        },
      };

      client.send('game-config', {
        success: true,
        config: gameConfig,
      });

      room.loggingService?.logStateChange('GAME_CONFIG_REQUESTED', {
        playerId: client.sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error sending game config:', error);
      client.send('game-config', {
        success: false,
        message: 'Failed to load game configuration',
      });
    }
  };
};
