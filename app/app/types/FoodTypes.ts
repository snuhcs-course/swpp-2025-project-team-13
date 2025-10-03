export interface FoodItem {
  id: number
  name: string
  distance: string
  image: string
  keywords: string[]
  category: string
  allergens: string[]
}

export interface Friend {
  id: number
  name: string
  avatar: string
  mutualLikes: number[]
}

export type FoodCategory = 
  | "korean"
  | "japanese" 
  | "chinese"
  | "western"
  | "snack food"
  | "burger"
  | "pizza"
  | "chicken"

export type AllergenType =
  | "eggs"
  | "soy"
  | "sesame"
  | "fish"
  | "shellfish"
  | "wheat"
  | "milk"
  | "peanuts"