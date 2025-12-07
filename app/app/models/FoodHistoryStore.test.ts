import { FoodHistoryStoreModel, FoodItemModel } from "./FoodHistoryStore"

describe("FoodItemModel", () => {
  it("should create a food item with required properties", () => {
    const foodItem = FoodItemModel.create({
      id: "1",
      name: "Test Food",
      distance: "0.5 km",
      image: "test-image.jpg",
      keywords: ["test", "food"],
      category: "restaurant",
      allergens: ["gluten"]
    })

    expect(foodItem.id).toBe("1")
    expect(foodItem.name).toBe("Test Food")
    expect(foodItem.distance).toBe("0.5 km")
    expect(foodItem.image).toBe("test-image.jpg")
    expect(foodItem.keywords).toEqual(["test", "food"])
    expect(foodItem.category).toBe("restaurant")
    expect(foodItem.allergens).toEqual(["gluten"])
  })
})

describe("FoodHistoryStoreModel", () => {
  let store: any

  beforeEach(() => {
    store = FoodHistoryStoreModel.create({
      scrappedItems: []
    })
  })

  describe("addScrappedItem", () => {
    it("should add a new item to scrapped items", () => {
      const item = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza", "italian"],
        category: "restaurant",
        allergens: ["gluten", "dairy"]
      }

      store.addScrappedItem(item)

      expect(store.scrappedItems.length).toBe(1)
      expect(store.scrappedItems[0].id).toBe("1")
      expect(store.scrappedItems[0].name).toBe("Pizza")
    })

    it("should not add duplicate items", () => {
      const item = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza", "italian"],
        category: "restaurant",
        allergens: ["gluten", "dairy"]
      }

      store.addScrappedItem(item)
      store.addScrappedItem(item) // Try to add same item again

      expect(store.scrappedItems.length).toBe(1)
    })

    it("should allow items with different IDs", () => {
      const item1 = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza"],
        category: "restaurant",
        allergens: ["gluten"]
      }

      const item2 = {
        id: "2",
        name: "Burger",
        distance: "0.8 km",
        image: "burger.jpg",
        keywords: ["burger"],
        category: "fast-food",
        allergens: ["gluten"]
      }

      store.addScrappedItem(item1)
      store.addScrappedItem(item2)

      expect(store.scrappedItems.length).toBe(2)
    })
  })

  describe("removeScrappedItem", () => {
    beforeEach(() => {
      const item = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza", "italian"],
        category: "restaurant",
        allergens: ["gluten", "dairy"]
      }
      store.addScrappedItem(item)
    })

    it("should remove an existing item", () => {
      expect(store.scrappedItems.length).toBe(1)
      
      store.removeScrappedItem("1")
      
      expect(store.scrappedItems.length).toBe(0)
    })

    it("should not affect store when removing non-existent item", () => {
      expect(store.scrappedItems.length).toBe(1)
      
      store.removeScrappedItem("999") // Non-existent ID
      
      expect(store.scrappedItems.length).toBe(1)
    })
  })

  describe("toggleScrappedItem", () => {
    const testItem = {
      id: "1",
      name: "Pizza",
      distance: "1.2 km",
      image: "pizza.jpg",
      keywords: ["pizza", "italian"],
      category: "restaurant",
      allergens: ["gluten", "dairy"]
    }

    it("should add item when not present", () => {
      expect(store.scrappedItems.length).toBe(0)
      
      store.toggleScrappedItem(testItem)
      
      expect(store.scrappedItems.length).toBe(1)
      expect(store.scrappedItems[0].id).toBe("1")
    })

    it("should remove item when present", () => {
      store.addScrappedItem(testItem)
      expect(store.scrappedItems.length).toBe(1)
      
      store.toggleScrappedItem(testItem)
      
      expect(store.scrappedItems.length).toBe(0)
    })

    it("should add item back after removing", () => {
      // Add item
      store.toggleScrappedItem(testItem)
      expect(store.scrappedItems.length).toBe(1)
      
      // Remove item
      store.toggleScrappedItem(testItem)
      expect(store.scrappedItems.length).toBe(0)
      
      // Add item again
      store.toggleScrappedItem(testItem)
      expect(store.scrappedItems.length).toBe(1)
      expect(store.scrappedItems[0].id).toBe("1")
    })
  })

  describe("scrappedItemsList view", () => {
    it("should return empty array when no items", () => {
      expect(store.scrappedItemsList).toEqual([])
    })

    it("should return items in reverse order (most recent first)", () => {
      const item1 = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza"],
        category: "restaurant",
        allergens: ["gluten"]
      }

      const item2 = {
        id: "2",
        name: "Burger",
        distance: "0.8 km",
        image: "burger.jpg",
        keywords: ["burger"],
        category: "fast-food",
        allergens: ["gluten"]
      }

      const item3 = {
        id: "3",
        name: "Salad",
        distance: "0.3 km",
        image: "salad.jpg",
        keywords: ["salad"],
        category: "healthy",
        allergens: []
      }

      store.addScrappedItem(item1)
      store.addScrappedItem(item2)
      store.addScrappedItem(item3)

      const list = store.scrappedItemsList
      expect(list.length).toBe(3)
      expect(list[0].id).toBe("3") // Most recent first
      expect(list[1].id).toBe("2")
      expect(list[2].id).toBe("1")
    })

    it("should not mutate original array", () => {
      const item = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza"],
        category: "restaurant",
        allergens: ["gluten"]
      }

      store.addScrappedItem(item)
      const list = store.scrappedItemsList
      
      // Modify the returned list
      list.push({} as any)
      
      // Original store should be unchanged
      expect(store.scrappedItems.length).toBe(1)
      expect(store.scrappedItemsList.length).toBe(1)
    })
  })

  describe("isScrapped view", () => {
    beforeEach(() => {
      const item = {
        id: "1",
        name: "Pizza",
        distance: "1.2 km",
        image: "pizza.jpg",
        keywords: ["pizza"],
        category: "restaurant",
        allergens: ["gluten"]
      }
      store.addScrappedItem(item)
    })

    it("should return true for scrapped item", () => {
      expect(store.isScrapped("1")).toBe(true)
    })

    it("should return false for non-scrapped item", () => {
      expect(store.isScrapped("999")).toBe(false)
    })

    it("should return false after item is removed", () => {
      expect(store.isScrapped("1")).toBe(true)
      
      store.removeScrappedItem("1")
      
      expect(store.isScrapped("1")).toBe(false)
    })
  })

  describe("store initialization", () => {
    it("should initialize with empty scrapped items", () => {
      const newStore = FoodHistoryStoreModel.create()
      expect(newStore.scrappedItems.length).toBe(0)
      expect(newStore.scrappedItemsList).toEqual([])
    })

    it("should initialize with provided scrapped items", () => {
      const initialItems = [
        {
          id: "1",
          name: "Pizza",
          distance: "1.2 km",
          image: "pizza.jpg",
          keywords: ["pizza"],
          category: "restaurant",
          allergens: ["gluten"]
        }
      ]

      const newStore = FoodHistoryStoreModel.create({
        scrappedItems: initialItems
      })

      expect(newStore.scrappedItems.length).toBe(1)
      expect(newStore.scrappedItems[0].name).toBe("Pizza")
    })
  })
})