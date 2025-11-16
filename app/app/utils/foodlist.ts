import foodlistData from "../data/foodlist.json"

// Cache the food list in memory
const FOOD_LIST: string[] = foodlistData

/**
 * Search foodlist locally for matching food names
 * Returns primary results (starting with query) and secondary results (containing query)
 */
export function searchFoodlist(query: string): {
  primary: string[]
  secondary: string[]
} {
  if (!query.trim()) {
    return { primary: [], secondary: [] }
  }

  const queryLower = query.toLowerCase()
  const primary: string[] = []
  const secondary: string[] = []

  for (const foodName of FOOD_LIST) {
    const nameLower = foodName.toLowerCase()
    if (nameLower.startsWith(queryLower)) {
      primary.push(foodName)
    } else if (nameLower.includes(queryLower)) {
      secondary.push(foodName)
    }
  }

  return { primary, secondary }
}

/**
 * Get all foods from foodlist
 */
export function getAllFoods(): string[] {
  return FOOD_LIST
}
