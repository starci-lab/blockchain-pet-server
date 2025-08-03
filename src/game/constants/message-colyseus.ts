export const MESSAGE_ON_COLYSEUS = {
  PET: {
    BUY: 'buy_pet',
    REMOVE: 'remove_pet',
    FEED: 'feed_pet',
    PLAY_WITH: 'play_with_pet',
    EATED_FOOD: 'eated_food',
    CLEANED_PET: 'cleaned_pet',
    PLAYED_PET: 'played_pet'
  }
}

export const MESSAGE_EMMITERS_COLYSEUS = {
  PET: {
    STATE_SYNC: 'pet_state_sync',
    BUY: 'create-pet-response',
    GET_STORE_CATALOG: 'get_store_catalog',
    GET_INVENTORY: 'get_inventory'
  },
  ACTION: {
    RESPONSE: 'action_response'
  }
}
