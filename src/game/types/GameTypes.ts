import { Client } from 'colyseus'
import { GameRoom } from '../rooms/game.room'
import { Pet, Player as BasePlayer } from '../schemas/game-room.schema'
import { MapSchema } from '@colyseus/schema'
import { Types } from 'mongoose'
export interface LoggingDetails {
  [key: string]: unknown
}

export interface GamePlayer extends BasePlayer {
  ownerId: string
  walletAddress: string
  pets: MapSchema<Pet>
}

export interface FoodItem {
  price: number
  nutrition: number
  name: string
}

export interface FoodItems {
  [key: string]: FoodItem
}

export interface StoreItem {
  price: number
  name: string
}

export interface StoreCategory {
  [key: string]: StoreItem
}

export interface StoreItems {
  [key: string]: StoreCategory
}

export interface PetStats {
  id: string
  petType: string
  hunger: number
  happiness: number
  cleanliness: number
  overallHealth: number
  lastUpdated: number
}

export interface InventoryEventData {
  sessionId: string
  itemType: string
  itemId: string
  quantity: number
  room: GameRoom
  client: Client
}

export interface InventorySummary {
  totalItems: number
  itemsByType: { [key: string]: number }
  items: Array<{
    type: string
    name: string
    id: string
    quantity: number
    totalPurchased: number
  }>
}

export interface PetEventData {
  sessionId: string
  petId?: string
  petType?: string
  room: GameRoom
  client: Client
  hungerLevel?: number
  happinessLevel?: number
  cleanlinessLevel?: number
  isBuyPet?: boolean
  foodType?: string
}

export interface PetType {
  _id: Types.ObjectId
  default_stats: {
    hunger: number
    last_update_hunger: Date
    happiness: number
    last_update_happiness: Date
    cleanliness: number
    last_update_cleanliness: Date
  }
  img_url: string
  description: string
  stat_decay: {
    hunger: {
      min: number
      max: number
    }
    happiness: {
      min: number
      max: number
    }
    cleanliness: {
      min: number
      max: number
    }
  }
  cost_nom: number
  name: string
  time_natural: number
  max_income: number
  income_per_claim: number
  max_income_per_claim: number
}

export interface DBPet {
  _id: Types.ObjectId
  type: PetType
  stats: {
    hunger: number
    happiness: number
    cleanliness: number
    last_update_happiness: Date
    last_update_hunger: Date
    last_update_cleanliness: Date
  }
  isAdult: boolean
  token_income: number
  total_income: number
  last_claim: Date
  owner_id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
