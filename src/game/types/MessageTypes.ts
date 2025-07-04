export interface CreatePetData {
  petId: string;
  x: number;
  y: number;
  petType?: string;
}

export interface PetActivityData {
  petId: string;
  activity: string;
  speed?: number;
  x?: number;
  y?: number;
}

export interface FoodPurchaseData {
  foodId: string;
  price: number;
  quantity?: number;
}

export interface FoodDropData {
  foodId: string;
  x: number;
  y: number;
  petId?: string;
}

export interface PetFeedData {
  petId: string;
  foodId: string;
  hungerBefore: number;
  hungerAfter: number;
}

export interface PetChaseData {
  petId: string;
  targetX: number;
  targetY: number;
  isChasing: boolean;
}

export interface RemovePetData {
  petId: string;
}

export interface PetStateData {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  hungerLevel: number;
  currentActivity: string;
  isChasing: boolean;
  speed: number;
  lastFedAt?: number;
  lastHungerUpdate?: number;
}
