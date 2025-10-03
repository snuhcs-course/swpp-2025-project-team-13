export interface FoodItem {
  id: number;
  name: string;
  distance: string;
  image: string;
  keywords: string[];
  category: string;
  allergens: string[];
}

export interface Friend {
  id: number;
  name: string;
  avatar: string;
  mutualLikes: number[];
}
