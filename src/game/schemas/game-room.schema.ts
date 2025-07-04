import { Schema, type, MapSchema } from '@colyseus/schema';

// Simplified Pet with essential stats only
export class Pet extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = '';
  @type('number') hunger: number = 100; // 0-100, decreases over time
  @type('number') happiness: number = 100; // 0-100, affected by feeding, playing
  @type('number') cleanliness: number = 100; // 0-100, decreases over time
  @type('string') petType: string = 'chog'; // Pet species/type
  @type('number') lastUpdated: number = 0; // For tracking stat decay

  constructor() {
    super();
    this.lastUpdated = Date.now();
  }
}

// Simple inventory item tracking
export class InventoryItem extends Schema {
  @type('string') itemType: string = ''; // 'food', 'toy', 'soap', etc.
  @type('string') itemName: string = ''; // 'hamburger', 'ball', 'shampoo'
  @type('number') quantity: number = 0;
  @type('number') totalPurchased: number = 0; // Track total ever bought

  constructor() {
    super();
  }
}

// Simplified Player with basic inventory
export class Player extends Schema {
  @type('string') sessionId: string = '';
  @type('string') name: string = '';
  @type('number') tokens: number = 100; // Game currency
  @type('number') totalPetsOwned: number = 0; // Count of pets owned
  @type({ map: InventoryItem }) inventory: MapSchema<InventoryItem> =
    new MapSchema<InventoryItem>();
  @type('number') joinedAt: number = 0;

  constructor() {
    super();
    this.joinedAt = Date.now();
  }
}

// Simplified Room State
export class GameRoomState extends Schema {
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type({ map: Pet }) pets: MapSchema<Pet> = new MapSchema<Pet>();
  @type('string') roomName: string = 'Pet Simulator Room';
  @type('number') playerCount: number = 0;
  @type('number') createdAt: number = 0;

  constructor() {
    super();
    this.createdAt = Date.now();
  }
}
