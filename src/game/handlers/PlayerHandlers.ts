import { Client } from 'colyseus';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { PetService } from '../services/PetService';

export class PlayerHandlers {
  static requestGameConfig(room: any) {
    return (client: Client) => {
      console.log(`⚙️ Game config requested by ${client.sessionId}`);

      client.send('game-config', ResponseBuilder.gameConfig());
    };
  }

  static requestPlayerState(room: any) {
    return (client: Client) => {
      console.log(`👤 Player state requested by ${client.sessionId}`);

      const player = room.state.players.get(client.sessionId);
      if (player) {
        // Send current player state to client
        client.send(
          'player-state-sync',
          ResponseBuilder.playerStateSync(player),
        );

        // Also send pets state for this player (always send, even if empty)
        const playerPets = PetService.getPlayerPets(
          room.state.pets,
          client.sessionId,
        );

        client.send(
          'pets-state-sync',
          ResponseBuilder.petsStateSync(playerPets),
        );

        room.loggingService.logStateChange('PLAYER_STATE_REQUESTED', {
          playerId: client.sessionId,
          playerName: player.name,
          tokens: player.tokens,
          inventorySize: player.foodInventory.size,
          petCount: playerPets.length,
        });
      }
    };
  }
}
