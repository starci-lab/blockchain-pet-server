export const GAME_CONFIG = {
  ROOM: {
    MAX_CLIENTS: 1,
    UPDATE_INTERVAL: 1000,
    RECONNECTION_TIME: 50,
    STATE_SUMMARY_INTERVAL: 30000,
  },

  PETS: {
    INITIAL_HUNGER: 100,
    HUNGER_DECREASE_RATE: 0.5,
    DEFAULT_SPEED: 40,
    DEFAULT_POSITION: { x: 400, y: 300 },
    DEFAULT_TYPE: 'chog',
  },

  ECONOMY: {
    INITIAL_TOKENS: 100,
    STARTER_FOOD_QUANTITY: 5,
  },

  FOOD: {
    DESPAWN_TIME: 20000,
    ITEMS: [
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
};
