import { Schema, type, MapSchema } from '@colyseus/schema';

export class Pet extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = '';
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') speed: number = 40;
  @type('string') currentActivity: string = 'walk';
  @type('number') hungerLevel: number = 100;
  @type('boolean') isChasing: boolean = false;
  @type('number') targetX: number = 0;
  @type('number') targetY: number = 0;
  @type('string') petType: string = 'chog';
  @type('number') lastFedAt: number = 0;
  @type('number') lastHungerUpdate: number = 0;

  constructor() {
    super();
    this.lastHungerUpdate = Date.now();
  }
}

export class FoodItem extends Schema {
  @type('string') id: string = '';
  @type('string') foodType: string = '';
  @type('number') quantity: number = 1;
  @type('number') price: number = 0;
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('string') droppedBy: string = '';
  @type('number') droppedAt: number = 0;

  constructor() {
    super();
    this.droppedAt = Date.now();
  }
}

export class Player extends Schema {
  @type('string') sessionId: string = '';
  @type('string') name: string = '';
  @type('number') joinedAt: number = 0;
  @type('boolean') isOnline: boolean = true;
  @type({ map: FoodItem }) foodInventory: MapSchema<FoodItem> =
    new MapSchema<FoodItem>();
  @type('number') tokens: number = 100; // Game currency

  constructor() {
    super();
    this.joinedAt = Date.now();
  }
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type({ map: Pet }) pets: MapSchema<Pet> = new MapSchema<Pet>();
  @type({ map: FoodItem }) droppedFood: MapSchema<FoodItem> =
    new MapSchema<FoodItem>();
  @type('string') roomName: string = 'Pet Simulator Room';
  @type('number') playerCount: number = 0;
  @type('boolean') isActive: boolean = true;
  @type('number') createdAt: number = 0;

  constructor() {
    super();
    this.createdAt = Date.now();
  }
}
