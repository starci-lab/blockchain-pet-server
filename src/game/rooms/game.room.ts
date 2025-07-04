import { Room, Client } from 'colyseus';
import {
  GameRoomState,
  Player,
  Pet,
  FoodItem,
} from '../schemas/game-room.schema';

export class GameRoom extends Room<GameRoomState> {
  maxClients = 10;

  onCreate(options: any) {
    console.log('🎮 Pet Simulator Room Created:', this.roomId);

    // Initialize room state using setState
    this.setState(new GameRoomState());
    this.state.roomName = options?.name || 'Pet Simulator Room';

    // Setup message handlers
    this.setupMessageHandlers();

    // Initialize game timer for hunger decrease
    this.setSimulationInterval(() => {
      this.updateGameLogic();
    }, 1000); // Update every second

    console.log('✅ Pet Simulator Room initialized successfully');

    // Log initial state
    this.logStateChange('ROOM_CREATED', {
      roomId: this.roomId,
      roomName: this.state.roomName,
      maxClients: this.maxClients,
    });

    this.logCurrentState();
  }

  private setupMessageHandlers() {
    // Handle pet creation
    this.onMessage(
      'create-pet',
      (
        client,
        data: {
          petId: string;
          x: number;
          y: number;
          petType?: string;
        },
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        console.log(`� Creating pet ${data.petId} for ${player.name}`);

        const pet = new Pet();
        pet.id = data.petId;
        pet.ownerId = client.sessionId;
        pet.x = data.x;
        pet.y = data.y;
        pet.petType = data.petType || 'chog';
        pet.hungerLevel = 100;
        pet.speed = 100;
        pet.currentActivity = 'idle';
        pet.isChasing = false;

        this.state.pets.set(data.petId, pet);

        this.logStateChange('PET_CREATED', {
          petId: data.petId,
          ownerId: client.sessionId,
          ownerName: player.name,
          position: { x: data.x, y: data.y },
          petType: data.petType,
        });

        // Broadcast pet creation to all players
        this.broadcast('pet-created', {
          pet: {
            id: pet.id,
            ownerId: pet.ownerId,
            ownerName: player.name,
            x: pet.x,
            y: pet.y,
            petType: pet.petType,
            hungerLevel: pet.hungerLevel,
            currentActivity: pet.currentActivity,
          },
          timestamp: Date.now(),
        });

        console.log(`✅ Pet ${data.petId} created for ${player.name}`);
      },
    );

    // Handle pet activity updates
    this.onMessage(
      'pet-activity',
      (
        client,
        data: {
          petId: string;
          activity: string;
          speed?: number;
          x?: number;
          y?: number;
        },
      ) => {
        const pet = this.state.pets.get(data.petId);
        if (!pet || pet.ownerId !== client.sessionId) return;

        // Update pet state
        pet.currentActivity = data.activity;
        if (data.speed !== undefined) pet.speed = data.speed;
        if (data.x !== undefined) pet.x = data.x;
        if (data.y !== undefined) pet.y = data.y;

        this.logStateChange('PET_ACTIVITY_UPDATED', {
          petId: data.petId,
          activity: data.activity,
          speed: data.speed,
          position: { x: data.x, y: data.y },
          ownerId: pet.ownerId,
        });

        // Broadcast to other players
        this.broadcast(
          'pet-activity-updated',
          {
            petId: data.petId,
            activity: data.activity,
            speed: data.speed,
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
          },
          { except: client },
        );
      },
    );

    // Handle food purchase
    this.onMessage(
      'food-purchase',
      (
        client,
        data: {
          foodId: string;
          price: number;
          quantity?: number;
        },
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        console.log(`🍔 Food purchase from ${player.name}:`, data);

        const quantity = data.quantity || 1;
        const totalPrice = data.price * quantity;

        // Validate purchase (you can add currency checks here)
        const success = this.validateFoodPurchase(
          player,
          data.foodId,
          totalPrice,
        );

        if (success) {
          // Add to player's food inventory
          const existingFood = player.foodInventory.get(data.foodId);
          const newQuantity = (existingFood?.quantity || 0) + quantity;

          const foodItem = new FoodItem();
          foodItem.id = data.foodId;
          foodItem.quantity = newQuantity;
          foodItem.price = data.price;

          player.foodInventory.set(data.foodId, foodItem);

          this.logStateChange('FOOD_PURCHASED', {
            playerId: client.sessionId,
            playerName: player.name,
            foodId: data.foodId,
            quantity,
            totalPrice,
            newQuantity: foodItem.quantity,
            playerTokens: player.tokens,
          });
        }

        // Send response
        client.send('food-purchase-response', {
          success,
          foodId: data.foodId,
          quantity,
          totalPrice,
          currentTokens: player.tokens, // Send current token count
          newInventory: success
            ? Array.from(player.foodInventory.values())
            : undefined,
          message: success
            ? `Đã mua thành công ${quantity}x ${data.foodId}`
            : `Không đủ token để mua ${data.foodId}. Cần ${totalPrice}, có ${player.tokens}`,
          timestamp: Date.now(),
        });

        if (success) {
          // Broadcast to other players
          this.broadcast(
            'player-purchased-food',
            {
              playerId: client.sessionId,
              playerName: player.name,
              foodId: data.foodId,
              quantity,
              totalPrice,
              timestamp: Date.now(),
            },
            { except: client },
          );
        }
      },
    );

    // Handle food drop
    this.onMessage(
      'food-drop',
      (
        client,
        data: {
          foodId: string;
          x: number;
          y: number;
          petId?: string;
        },
      ) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const foodItem = player.foodInventory.get(data.foodId);
        if (!foodItem || foodItem.quantity <= 0) {
          client.send('food-drop-response', {
            success: false,
            error: 'Không có thức ăn trong inventory',
          });
          return;
        }

        // Remove from inventory
        if (foodItem.quantity > 1) {
          foodItem.quantity -= 1;
        } else {
          player.foodInventory.delete(data.foodId);
        }

        // Create dropped food in world
        const droppedFoodId = `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const droppedFood = new FoodItem();
        droppedFood.id = droppedFoodId;
        droppedFood.foodType = data.foodId;
        droppedFood.x = data.x;
        droppedFood.y = data.y;
        droppedFood.quantity = 1;
        droppedFood.droppedBy = client.sessionId;
        droppedFood.droppedAt = Date.now();

        this.state.droppedFood.set(droppedFoodId, droppedFood);

        this.logStateChange('FOOD_DROPPED', {
          droppedFoodId,
          foodType: data.foodId,
          position: { x: data.x, y: data.y },
          droppedBy: client.sessionId,
          playerName: player.name,
          remainingInventory: foodItem ? foodItem.quantity : 0,
        });

        // Auto-despawn after 20 seconds
        this.clock.setTimeout(() => {
          if (this.state.droppedFood.has(droppedFoodId)) {
            this.state.droppedFood.delete(droppedFoodId);

            this.logStateChange('FOOD_DESPAWNED', {
              droppedFoodId,
              foodType: data.foodId,
              position: { x: data.x, y: data.y },
              reason: 'timeout',
              despawnAfterSeconds: 20,
            });

            this.broadcast('food-despawned', {
              foodId: droppedFoodId,
              timestamp: Date.now(),
            });
          }
        }, 20000);

        // Broadcast food drop to all players
        this.broadcast('food-dropped', {
          foodId: droppedFoodId,
          foodType: data.foodId,
          x: data.x,
          y: data.y,
          droppedBy: client.sessionId,
          playerName: player.name,
          timestamp: Date.now(),
        });

        console.log(
          `🍔 ${player.name} dropped ${data.foodId} at (${data.x}, ${data.y})`,
        );
      },
    );

    // Handle pet feeding
    this.onMessage(
      'pet-feed',
      (
        client,
        data: {
          petId: string;
          foodId: string;
          hungerBefore: number;
          hungerAfter: number;
        },
      ) => {
        const pet = this.state.pets.get(data.petId);
        if (!pet || pet.ownerId !== client.sessionId) return;

        // Update pet hunger
        pet.hungerLevel = Math.min(100, data.hungerAfter);
        pet.lastFedAt = Date.now();

        // Remove dropped food if it was from world
        if (this.state.droppedFood.has(data.foodId)) {
          this.state.droppedFood.delete(data.foodId);

          this.logStateChange('FOOD_CONSUMED', {
            foodId: data.foodId,
            petId: data.petId,
            consumedBy: client.sessionId,
            petHungerBefore: data.hungerBefore,
            petHungerAfter: pet.hungerLevel,
          });

          this.broadcast('food-consumed', {
            foodId: data.foodId,
            petId: data.petId,
            consumedBy: client.sessionId,
            timestamp: Date.now(),
          });
        }

        // Broadcast feeding event
        this.broadcast('pet-fed', {
          petId: data.petId,
          foodType: data.foodId,
          hungerBefore: data.hungerBefore,
          hungerAfter: pet.hungerLevel,
          fedBy: client.sessionId,
          timestamp: Date.now(),
        });

        console.log(
          `🍽️ Pet ${data.petId} fed with ${data.foodId}, hunger: ${data.hungerBefore} → ${pet.hungerLevel}`,
        );
      },
    );

    // Handle pet movement/chasing
    this.onMessage(
      'pet-chase',
      (
        client,
        data: {
          petId: string;
          targetX: number;
          targetY: number;
          isChasing: boolean;
        },
      ) => {
        const pet = this.state.pets.get(data.petId);
        if (!pet || pet.ownerId !== client.sessionId) return;

        pet.targetX = data.targetX;
        pet.targetY = data.targetY;
        pet.isChasing = data.isChasing;
        pet.currentActivity = data.isChasing ? 'chase' : 'walk';

        this.logStateChange('PET_CHASE_UPDATED', {
          petId: data.petId,
          targetPosition: { x: data.targetX, y: data.targetY },
          isChasing: data.isChasing,
          activity: pet.currentActivity,
          ownerId: pet.ownerId,
        });

        // Broadcast to other players
        this.broadcast(
          'pet-chase-updated',
          {
            petId: data.petId,
            targetX: data.targetX,
            targetY: data.targetY,
            isChasing: data.isChasing,
            activity: pet.currentActivity,
            timestamp: Date.now(),
          },
          { except: client },
        );
      },
    );

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

    // Handle game config requests
    this.onMessage('request-game-config', (client) => {
      console.log(`⚙️ Game config requested by ${client.sessionId}`);

      client.send('game-config', {
        food: {
          items: [
            {
              id: 'hamburger',
              name: 'Hamburger',
              price: 5,
              hungerRestore: 15,
              texture: 'hamburger',
            },
            {
              id: 'apple',
              name: 'Apple',
              price: 3,
              hungerRestore: 10,
              texture: 'apple',
            },
            {
              id: 'bone',
              name: 'Bone',
              price: 5,
              hungerRestore: 12,
              texture: 'bone',
            },
          ],
        },
        pets: {
          initialHunger: 100,
          hungerDecreaseRate: 0.5,
          movementSpeed: 100,
          despawnTime: 20000,
        },
        economy: {
          initialTokens: 100,
        },
        timestamp: Date.now(),
      });
    });

    // Handle player state requests
    this.onMessage('request-player-state', (client) => {
      console.log(`👤 Player state requested by ${client.sessionId}`);

      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Send current player state to client
        client.send('player-state-sync', {
          playerId: client.sessionId,
          tokens: player.tokens,
          isOnline: player.isOnline,
          inventory: Object.fromEntries(player.foodInventory.entries()),
          timestamp: Date.now(),
        });

        this.logStateChange('PLAYER_STATE_REQUESTED', {
          playerId: client.sessionId,
          playerName: player.name,
          tokens: player.tokens,
          inventorySize: player.foodInventory.size,
        });
      }
    });

    console.log('✅ Message handlers setup complete');
  }

  private validateFoodPurchase(
    player: Player,
    foodId: string,
    price: number,
  ): boolean {
    // Check if player has enough tokens
    if (player.tokens >= price) {
      // Deduct tokens from player
      player.tokens -= price;

      this.logStateChange('TOKENS_DEDUCTED', {
        playerId: player.sessionId,
        playerName: player.name,
        foodId,
        price,
        previousTokens: player.tokens + price,
        newTokens: player.tokens,
      });

      return true;
    } else {
      this.logStateChange('PURCHASE_FAILED_INSUFFICIENT_TOKENS', {
        playerId: player.sessionId,
        playerName: player.name,
        foodId,
        price,
        currentTokens: player.tokens,
        needed: price - player.tokens,
      });

      return false;
    }
  }

  private updateGameLogic() {
    // Update pet hunger levels
    const now = Date.now();
    let hungerUpdatesCount = 0;

    this.state.pets.forEach((pet) => {
      const lastUpdate = pet.lastHungerUpdate || now;
      const timeDiff = (now - lastUpdate) / 1000; // seconds

      if (timeDiff >= 1) {
        // Update every second
        const hungerDecrease = 0.5; // 0.5% per second
        const previousHunger = pet.hungerLevel;
        pet.hungerLevel = Math.max(0, pet.hungerLevel - hungerDecrease);
        pet.lastHungerUpdate = now;
        hungerUpdatesCount++;

        // Log significant hunger changes
        if (Math.floor(previousHunger) !== Math.floor(pet.hungerLevel)) {
          this.logStateChange('PET_HUNGER_DECREASED', {
            petId: pet.id,
            previousHunger,
            newHunger: pet.hungerLevel,
            timeDiff,
          });
        }

        // Broadcast hunger update if significant change
        if (Math.floor(pet.hungerLevel) % 5 === 0) {
          this.broadcast('pet-hunger-updated', {
            petId: pet.id,
            hungerLevel: pet.hungerLevel,
            timestamp: now,
          });
        }
      }
    });

    // Log periodic state summary (every 30 seconds)
    if (!this.lastStateSummary || now - this.lastStateSummary > 30000) {
      console.log(`⏰ [PERIODIC STATE SUMMARY] ${new Date().toISOString()}`);
      this.logCurrentState();
      this.lastStateSummary = now;
    }
  }

  private lastStateSummary: number = 0;

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

    this.logStateChange('PLAYER_JOINED', {
      sessionId: client.sessionId,
      playerName: player.name,
      totalPlayers: this.state.playerCount,
    });

    // Log current state after player joins
    this.logCurrentState();

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

      this.logStateChange('PLAYER_LEFT', {
        sessionId: client.sessionId,
        playerName: player.name,
        totalPlayers: this.state.playerCount,
        consented,
      });

      // Log current state after player leaves
      this.logCurrentState();

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

    this.logStateChange('ROOM_DISPOSED', {
      roomId: this.roomId,
      finalPlayerCount: this.state.playerCount,
      finalPetCount: this.state.pets.size,
      finalDroppedFoodCount: this.state.droppedFood.size,
    });

    // Final state log
    console.log(`📊 [FINAL STATE] Room ${this.roomId} before disposal:`);
    this.logCurrentState();
  }

  private logStateChange(action: string, details: any) {
    console.log(`🔄 [STATE CHANGE] ${action}:`, {
      timestamp: new Date().toISOString(),
      roomId: this.roomId,
      playerCount: this.state.playerCount,
      petCount: this.state.pets.size,
      droppedFoodCount: this.state.droppedFood.size,
      details,
    });
  }

  private logCurrentState() {
    console.log(`📊 [CURRENT STATE] Room ${this.roomId}:`, {
      timestamp: new Date().toISOString(),
      roomName: this.state.roomName,
      isActive: this.state.isActive,
      playerCount: this.state.playerCount,
      players: Array.from(this.state.players.entries()).map(([id, player]) => ({
        sessionId: id,
        name: player.name,
        tokens: player.tokens,
        isOnline: player.isOnline,
        foodInventoryCount: player.foodInventory.size,
      })),
      pets: Array.from(this.state.pets.entries()).map(([id, pet]) => ({
        id,
        ownerId: pet.ownerId,
        x: pet.x,
        y: pet.y,
        hungerLevel: pet.hungerLevel,
        currentActivity: pet.currentActivity,
        isChasing: pet.isChasing,
        lastFedAt: pet.lastFedAt,
      })),
      droppedFood: Array.from(this.state.droppedFood.entries()).map(
        ([id, food]) => ({
          id,
          foodType: food.foodType,
          x: food.x,
          y: food.y,
          quantity: food.quantity,
          droppedBy: food.droppedBy,
          droppedAt: food.droppedAt,
        }),
      ),
    });
  }
}
