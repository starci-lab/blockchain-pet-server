import { Room, Client } from 'colyseus';
import { GameRoomState, Player } from '../schemas/game-room.schema';

export class GameRoom extends Room<GameRoomState> {
  maxClients = 10;

  onCreate(options: any) {
    console.log('🎮 Game Room Created:', this.roomId);

    // Initialize room state using setState
    this.setState(new GameRoomState());
    this.state.roomName = options?.name || 'Pet Simulator Game';

    // Setup message handlers
    this.setupMessageHandlers();

    console.log('✅ Game Room initialized successfully');
  }

  private setupMessageHandlers() {
    // Handle chat messages
    this.onMessage('chat', (client, data: { message: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      console.log(`💬 Chat from ${player.name}: ${data.message}`);

      // Broadcast chat to all players
      this.broadcast('chat', {
        playerId: client.sessionId,
        playerName: player.name,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    // Handle player position updates
    this.onMessage('move', (client, data: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Broadcast movement to other players
      this.broadcast(
        'player-moved',
        {
          playerId: client.sessionId,
          x: data.x,
          y: data.y,
        },
        { except: client },
      );
    });

    // Handle food purchase
    this.onMessage(
      'food-purchase',
      (client, data: { foodId: string; price: number; timestamp: number }) => {
        console.log(`🍔 Food purchase from ${client.sessionId}:`, data);

        const { foodId, price, timestamp } = data;

        client.send('food-purchase-response', {
          success: true,
          foodId,
          price,
          message: `Đã mua thành công ${foodId} với giá ${price}`,
          timestamp: Date.now(),
        });

        this.broadcast(
          'player-purchased-food',
          {
            playerId: client.sessionId,
            foodId,
            price,
            timestamp,
          },
          { except: client },
        );
      },
    );
    console.log(`[Sent message] ${this.roomId}`);
  }

  onJoin(client: Client, options: any) {
    console.log(`👋 Player joined: ${client.sessionId}`);

    // Create new player
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options?.name || `Player_${client.sessionId.substring(0, 6)}`;
    player.isOnline = true;

    // Add to room state
    this.state.players.set(client.sessionId, player);
    this.state.playerCount = this.state.players.size;

    // Send welcome message
    client.send('welcome', {
      message: `Welcome ${player.name}!`,
      roomId: this.roomId,
      roomName: this.state.roomName,
    });

    // Send current players list
    client.send('players-list', {
      players: Array.from(this.state.players.values()).map((p) => ({
        sessionId: p.sessionId,
        name: p.name,
        isOnline: p.isOnline,
      })),
    });

    // Notify other players
    this.broadcast(
      'player-joined',
      {
        player: {
          sessionId: player.sessionId,
          name: player.name,
        },
        totalPlayers: this.state.playerCount,
      },
      { except: client },
    );

    console.log(
      `✅ ${player.name} joined successfully. Total players: ${this.state.playerCount}`,
    );
  }

  onLeave(client: Client, consented?: boolean) {
    console.log(`👋 Player left: ${client.sessionId}, consented: ${consented}`);
    this.allowReconnection(client, 50);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Remove player immediately (no reconnection for simplicity)
      this.state.players.delete(client.sessionId);
      this.state.playerCount = this.state.players.size;

      // Notify remaining players
      this.broadcast('player-left', {
        player: {
          sessionId: player.sessionId,
          name: player.name,
        },
        totalPlayers: this.state.playerCount,
      });

      console.log(
        `🗑️ ${player.name} removed. Remaining players: ${this.state.playerCount}`,
      );
    }
  }

  onDispose() {
    console.log(`🗑️ Game Room disposed: ${this.roomId}`);
    this.state.isActive = false;
  }
}
