import { Client } from 'colyseus';
import { ResponseBuilder } from '../../utils/ResponseBuilder';
import { PetService } from '../../services/PetService';
import { InventoryService } from '../../services/InventoryService';

// Import specific handlers
import { updatePlayerSettings } from './update-settings';
import { updateTutorial } from './update-tutorial';
import { requestGameConfig } from './game-config';
import { requestPlayerState } from './player-state';
import { getProfile } from './profile';
import { claimDailyReward } from './daily-reward';

export class PlayerModule {
  // Use modular approach for all handlers
  static requestGameConfig = requestGameConfig;
  static requestPlayerState = requestPlayerState;
  static getProfile = getProfile;
  static updateSettings = updatePlayerSettings;
  static updateTutorial = updateTutorial;
  static claimDailyReward = claimDailyReward;

  // Helper methods for common player operations
  static validatePlayer(room: any, client: Client): any {
    const player = room.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`⚠️ Player not found for session: ${client.sessionId}`);
      return null;
    }
    return player;
  }

  static sendPlayerError(
    client: Client,
    action: string,
    message: string = 'Player not found',
  ) {
    client.send(`${action}-response`, {
      success: false,
      message,
    });
  }

  static logPlayerAction(
    room: any,
    action: string,
    playerId: string,
    data: any = {},
  ) {
    room.loggingService?.logStateChange(action, {
      playerId,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}
