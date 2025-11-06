import { Instance, SnapshotOut, types } from "mobx-state-tree"

/**
 * Model for a scrapped menu item
 */
export const MenuScrapModel = types.model("MenuScrap").props({
  id: types.identifier,
  menu_name: types.string,
  place_name: types.string,
  price: types.maybeNull(types.number),
  category: types.string,
  location: types.string,
  rating: types.number,
  review_count: types.number,
  image_url: types.maybeNull(types.string),
  coordinates: types.array(types.number),
  scrapped_at: types.Date,
})

/**
 * Store for managing menu scraps
 */
export const MenuScrapStoreModel = types
  .model("MenuScrapStore")
  .props({
    scrappedMenus: types.array(MenuScrapModel),
  })
  .actions((self) => ({
    addScrappedMenu(item: {
      id: number | string
      menu_name: string
      place_name: string
      price: number | null
      category: string
      location: string
      rating: number
      review_count: number
      image_url?: string
      coordinates: [number, number]
    }) {
      // Check if item already exists
      const itemId = String(item.id)
      const exists = self.scrappedMenus.find((i) => i.id === itemId)
      if (!exists) {
        self.scrappedMenus.push({
          ...item,
          id: itemId,
          image_url: item.image_url || null,
          scrapped_at: new Date(),
        })
      }
    },
    removeScrappedMenu(id: number | string) {
      const itemId = String(id)
      const item = self.scrappedMenus.find((i) => i.id === itemId)
      if (item) {
        self.scrappedMenus.remove(item)
      }
    },
    toggleScrappedMenu(item: {
      id: number | string
      menu_name: string
      place_name: string
      price: number | null
      category: string
      location: string
      rating: number
      review_count: number
      image_url?: string
      coordinates: [number, number]
    }) {
      const itemId = String(item.id)
      const exists = self.scrappedMenus.find((i) => i.id === itemId)
      if (exists) {
        self.scrappedMenus.remove(exists)
        return false // Unscrapped
      } else {
        self.scrappedMenus.push({
          ...item,
          id: itemId,
          image_url: item.image_url || null,
          scrapped_at: new Date(),
        })
        return true // Scrapped
      }
    },
  }))
  .views((self) => ({
    get scrappedMenusList() {
      return self.scrappedMenus.slice().reverse() // Most recent first
    },
    isScrapped(id: number | string) {
      const itemId = String(id)
      return self.scrappedMenus.some((i) => i.id === itemId)
    },
  }))

export interface MenuScrapStore extends Instance<typeof MenuScrapStoreModel> {}
export interface MenuScrapStoreSnapshot extends SnapshotOut<typeof MenuScrapStoreModel> {}

