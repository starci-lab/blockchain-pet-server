import { Client } from 'colyseus';
import { eventBus } from 'src/shared/even-bus';

export class PlayerEmitter {
  // Game config handler - emit to PlayerService
  static requestGameConfig(room: any) {
    return (client: Client, data: any) => {
      console.log(`⚙️ [Handler] Request game config`);

      eventBus.emit('player.get_game_config', {
        sessionId: client.sessionId,
        room,
        client,
      });
    };
  }

  // Player state handler - emit to PlayerService
  static requestPlayerState(room: any) {
    return (client: Client, data: any) => {
      console.log(`👤 [Handler] Request player state`);

      eventBus.emit('player.get_state', {
        sessionId: client.sessionId,
        room,
        client,
      });
    };
  }

  // Profile handler - emit to PlayerService
  static getProfile(room: any) {
    return (client: Client, data: any) => {
      console.log(`📋 [Handler] Get profile request`);

      eventBus.emit('player.get_profile', {
        sessionId: client.sessionId,
        room,
        client,
      });
    };
  }

  // Daily reward handler - emit to PlayerService
  static claimDailyReward(room: any) {
    return (client: Client, data: any) => {
      console.log(`🎁 [Handler] Claim daily reward`);

      eventBus.emit('player.claim_daily_reward', {
        sessionId: client.sessionId,
        room,
        client,
      });
    };
  }

  // Settings update handler - emit to PlayerService
  static updateSettings(room: any) {
    return (client: Client, data: any) => {
      console.log(`⚙️ [Handler] Update settings:`, data);

      eventBus.emit('player.update_settings', {
        sessionId: client.sessionId,
        settings: data,
        room,
        client,
      });
    };
  }

  // Tutorial update handler - emit to PlayerService
  static updateTutorial(room: any) {
    return (client: Client, data: any) => {
      console.log(`📚 [Handler] Update tutorial:`, data);

      eventBus.emit('player.update_tutorial', {
        sessionId: client.sessionId,
        tutorialData: data,
        room,
        client,
      });
    };
  }

  // Request pets state handler - emit to PlayerService or PetService
  static requestPetsState(room: any) {
    return (client: Client, data: any) => {
      console.log(`🐕 [Emitter] Request pets state from ${client.sessionId}`);

      eventBus.emit('player.get_pets_state', {
        sessionId: client.sessionId,
        room,
        client,
        data,
      });
    };
  }

  // Helper methods for validation (can be used by services)
  static validatePlayer(room: any, sessionId: string): any {
    const player = room.state.players.get(sessionId);
    if (!player) {
      console.warn(`⚠️ Player not found for session: ${sessionId}`);
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
