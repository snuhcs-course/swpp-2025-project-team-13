import { Instance, SnapshotOut, types } from "mobx-state-tree"

/**
 * Model for a scrapped food item
 */
export const FoodItemModel = types.model("FoodItem").props({
  id: types.identifierNumber,
  name: types.string,
  distance: types.string,
  image: types.string,
  keywords: types.array(types.string),
  category: types.string,
  allergens: types.array(types.string),
})

/**
 * Store for managing food history (scrapped items)
 */
export const FoodHistoryStoreModel = types
  .model("FoodHistoryStore")
  .props({
    scrappedItems: types.array(FoodItemModel),
  })
  .actions((self) => ({
    addScrappedItem(item: {
      id: number
      name: string
      distance: string
      image: string
      keywords: string[]
      category: string
      allergens: string[]
    }) {
      // Check if item already exists
      const exists = self.scrappedItems.find((i) => i.id === item.id)
      if (!exists) {
        self.scrappedItems.push(item)
      }
    },
    removeScrappedItem(id: number) {
      const item = self.scrappedItems.find((i) => i.id === id)
      if (item) {
        self.scrappedItems.remove(item)
      }
    },
    toggleScrappedItem(item: {
      id: number
      name: string
      distance: string
      image: string
      keywords: string[]
      category: string
      allergens: string[]
    }) {
      const exists = self.scrappedItems.find((i) => i.id === item.id)
      if (exists) {
        self.scrappedItems.remove(exists)
      } else {
        self.scrappedItems.push(item)
      }
    },
  }))
  .views((self) => ({
    get scrappedItemsList() {
      return self.scrappedItems.slice().reverse() // Most recent first
    },
    isScrapped(id: number) {
      return self.scrappedItems.some((i) => i.id === id)
    },
  }))

export interface FoodHistoryStore extends Instance<typeof FoodHistoryStoreModel> {}
export interface FoodHistoryStoreSnapshot extends SnapshotOut<typeof FoodHistoryStoreModel> {}

