import { Client } from 'colyseus';
import { PlayerService } from '../../../services/PlayerService';
import { InventoryService } from '../../../services/InventoryService';
import { ResponseBuilder } from '../../../utils/ResponseBuilder';

// Player Settings Update Handler
export const updatePlayerSettings = (room: any) => {
  return async (
    client: Client,
    data: {
      name?: string;
      preferences?: any;
    },
  ) => {
    try {
      const player = room.state.players.get(client.sessionId);
      if (!player) {
        client.send('update-settings-response', {
          success: false,
          message: 'Player not found',
        });
        return;
      }

      console.log(`⚙️ Updating settings for ${player.name}:`, data);

      // Update player name if provided
      if (data.name && data.name.trim() !== '') {
        const oldName = player.name;
        player.name = data.name.trim();
        console.log(`📝 Player name changed: ${oldName} -> ${player.name}`);
      }

      // Save updated player data
      PlayerService.savePlayerData(player);

      // Send response
      client.send('update-settings-response', {
        success: true,
        message: 'Settings updated successfully',
        player: {
          name: player.name,
          tokens: player.tokens,
          totalPetsOwned: player.totalPetsOwned,
        },
      });

      room.loggingService.logStateChange('PLAYER_SETTINGS_UPDATED', {
        playerId: client.sessionId,
        playerName: player.name,
        changes: data,
      });
    } catch (error) {
      console.error('❌ Error updating player settings:', error);
      client.send('update-settings-response', {
        success: false,
        message: 'Failed to update settings',
      });
    }
  };
};
