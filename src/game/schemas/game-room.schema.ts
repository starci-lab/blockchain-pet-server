import { Schema, type, MapSchema } from '@colyseus/schema';

export class Player extends Schema {
  @type('string')
  sessionId: string = '';
  @type('string')
  name: string = '';
  @type('boolean')
  isOnline: boolean = true;

  constructor() {
    super();
  }
}

export class GameRoomState extends Schema {
  @type({ map: Player })
  players: MapSchema<Player> = new MapSchema<Player>();
  @type('string')
  roomName: string = 'Game Room';
  @type('boolean')
  isActive: boolean = true;
  @type('number')
  playerCount: number = 0;

  constructor() {
    super();
  }
}
