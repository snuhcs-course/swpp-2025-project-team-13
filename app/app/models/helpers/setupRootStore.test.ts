import { RootStoreModel } from "../RootStore"
import { setupRootStore } from "./setupRootStore"
import * as storage from "../../utils/storage"

// Mock the storage module
jest.mock("../../utils/storage", () => ({
  load: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
}))

const mockStorage = storage as jest.Mocked<typeof storage>

describe("setupRootStore", () => {
  let rootStore: any

  beforeEach(() => {
    rootStore = RootStoreModel.create()
    jest.clearAllMocks()
    // Reset global dev flag for consistent testing
    global.__DEV__ = false
  })

  afterEach(() => {
    // Clean up any disposers that might be created
    jest.clearAllMocks()
  })

  it("should setup root store without restored state", async () => {
    mockStorage.load.mockResolvedValue(null)

    const result = await setupRootStore(rootStore)

    expect(result.rootStore).toBe(rootStore)
    expect(result.restoredState).toEqual({})
    expect(result.unsubscribe).toBeInstanceOf(Function)
    expect(mockStorage.load).toHaveBeenCalledWith("root-v1")
  })

  it("should restore state from storage", async () => {
    const savedState = {
      foodHistoryStore: {
        scrappedItems: [
          {
            id: "1",
            name: "Saved Pizza",
            distance: "1.0 km",
            image: "pizza.jpg",
            keywords: ["pizza"],
            category: "restaurant",
            allergens: ["gluten"]
          }
        ]
      }
    }

    mockStorage.load.mockResolvedValue(savedState)

    const result = await setupRootStore(rootStore)

    expect(result.restoredState).toEqual(savedState)
    expect(rootStore.foodHistoryStore.scrappedItems.length).toBe(1)
    expect(rootStore.foodHistoryStore.scrappedItems[0].name).toBe("Saved Pizza")
  })

  it("should handle storage load errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    global.__DEV__ = true
    
    mockStorage.load.mockRejectedValue(new Error("Storage error"))

    const result = await setupRootStore(rootStore)

    expect(result.rootStore).toBe(rootStore)
    expect(result.restoredState).toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith("Storage error")
    
    consoleErrorSpy.mockRestore()
  })

  it("should not log errors in production", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    global.__DEV__ = false
    
    mockStorage.load.mockRejectedValue(new Error("Storage error"))

    const result = await setupRootStore(rootStore)

    expect(result.rootStore).toBe(rootStore)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    
    consoleErrorSpy.mockRestore()
  })

  it("should save snapshots when store changes", async () => {
    mockStorage.load.mockResolvedValue(null)

    const result = await setupRootStore(rootStore)

    // Make a change to trigger snapshot
    rootStore.foodHistoryStore.addScrappedItem({
      id: "1",
      name: "Test Food",
      distance: "1.0 km",
      image: "test.jpg",
      keywords: ["test"],
      category: "restaurant",
      allergens: []
    })

    // Wait for snapshot to be saved
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockStorage.save).toHaveBeenCalledWith("root-v1", expect.objectContaining({
      foodHistoryStore: expect.objectContaining({
        scrappedItems: expect.arrayContaining([
          expect.objectContaining({
            id: "1",
            name: "Test Food"
          })
        ])
      })
    }))

    // Clean up
    result.unsubscribe()
  })

  it("should provide working unsubscribe function", async () => {
    mockStorage.load.mockResolvedValue(null)

    const result = await setupRootStore(rootStore)

    // Unsubscribe should not throw
    expect(() => result.unsubscribe()).not.toThrow()

    // After unsubscribe, changes should not trigger saves
    jest.clearAllMocks()
    
    rootStore.foodHistoryStore.addScrappedItem({
      id: "2",
      name: "Test Food 2",
      distance: "1.0 km",
      image: "test2.jpg",
      keywords: ["test"],
      category: "restaurant",
      allergens: []
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockStorage.save).not.toHaveBeenCalled()
  })

  it("should handle multiple setup calls correctly", async () => {
    mockStorage.load.mockResolvedValue(null)

    const result1 = await setupRootStore(rootStore)
    const result2 = await setupRootStore(rootStore)

    expect(result1.rootStore).toBe(rootStore)
    expect(result2.rootStore).toBe(rootStore)

    // Both should have valid unsubscribe functions
    expect(() => result1.unsubscribe()).not.toThrow()
    expect(() => result2.unsubscribe()).not.toThrow()
  })

  describe("User Logout Handling", () => {
    it("should skip restore when user logged out flag is set", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      
      mockStorage.load
        .mockResolvedValueOnce("true") // user-logged-out flag
        .mockResolvedValueOnce(null)   // preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(result.restoredState).toBeUndefined()
      expect(mockStorage.load).toHaveBeenCalledWith("user-logged-out")
      expect(mockStorage.remove).toHaveBeenCalledWith("user-logged-out")
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("User logged out detected")
      )
      
      consoleLogSpy.mockRestore()
    })

    it("should restore preserved scraped menus after logout", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      
      const preservedMenus = [
        {
          id: "1",
          menu_name: "Pizza",
          place_name: "Pizza Place",
          price: 15000,
          category: "Italian",
          location: "Seoul",
          rating: 4.5,
          review_count: 100,
          image_url: "https://example.com/pizza.jpg",
          coordinates: [37.5665, 126.9780],
        },
        {
          id: "2",
          menu_name: "Burger",
          place_name: "Burger Joint",
          price: 12000,
          category: "American",
          location: "Seoul",
          rating: 4.2,
          review_count: 80,
          image_url: "https://example.com/burger.jpg",
          coordinates: [37.5665, 126.9780],
        },
      ]

      mockStorage.load
        .mockResolvedValueOnce("true")           // user-logged-out flag
        .mockResolvedValueOnce(preservedMenus)   // preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(mockStorage.remove).toHaveBeenCalledWith("user-logged-out")
      expect(mockStorage.remove).toHaveBeenCalledWith("preserved-scraped-menus")
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Restoring 2 preserved scraped menus")
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Successfully restored and cleaned up")
      )
      
      // Verify menus were added to the store
      expect(rootStore.menuScrapStore.scrappedMenus.length).toBe(2)
      expect(rootStore.menuScrapStore.scrappedMenus[0].menu_name).toBe("Pizza")
      expect(rootStore.menuScrapStore.scrappedMenus[1].menu_name).toBe("Burger")
      
      consoleLogSpy.mockRestore()
    })

    it("should handle empty preserved menus array", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      
      mockStorage.load
        .mockResolvedValueOnce("true")  // user-logged-out flag
        .mockResolvedValueOnce([])      // empty preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(mockStorage.remove).toHaveBeenCalledWith("user-logged-out")
      expect(mockStorage.remove).not.toHaveBeenCalledWith("preserved-scraped-menus")
      expect(rootStore.menuScrapStore.scrappedMenus.length).toBe(0)
      
      consoleLogSpy.mockRestore()
    })

    it("should handle null preserved menus", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      
      mockStorage.load
        .mockResolvedValueOnce("true")  // user-logged-out flag
        .mockResolvedValueOnce(null)    // null preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(mockStorage.remove).toHaveBeenCalledWith("user-logged-out")
      expect(mockStorage.remove).not.toHaveBeenCalledWith("preserved-scraped-menus")
      expect(rootStore.menuScrapStore.scrappedMenus.length).toBe(0)
      
      consoleLogSpy.mockRestore()
    })

    it("should handle non-array preserved menus", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      
      mockStorage.load
        .mockResolvedValueOnce("true")              // user-logged-out flag
        .mockResolvedValueOnce({ invalid: "data" }) // invalid preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(mockStorage.remove).toHaveBeenCalledWith("user-logged-out")
      expect(mockStorage.remove).not.toHaveBeenCalledWith("preserved-scraped-menus")
      expect(rootStore.menuScrapStore.scrappedMenus.length).toBe(0)
      
      consoleLogSpy.mockRestore()
    })

    it("should handle error when restoring preserved menus", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()
      
      mockStorage.load
        .mockResolvedValueOnce("true")  // user-logged-out flag
        .mockRejectedValueOnce(new Error("Storage read error")) // error reading preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(mockStorage.remove).toHaveBeenCalledWith("user-logged-out")
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to restore preserved scraped menus:",
        expect.any(Error)
      )
      
      consoleLogSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })

    it("should restore multiple preserved menus correctly", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
      
      const preservedMenus = [
        {
          id: "1",
          menu_name: "Menu 1",
          place_name: "Place 1",
          price: 10000,
          category: "Korean",
          location: "Seoul",
          rating: 4.0,
          review_count: 50,
          image_url: "https://example.com/1.jpg",
          coordinates: [37.5, 127.0],
        },
        {
          id: "2",
          menu_name: "Menu 2",
          place_name: "Place 2",
          price: 20000,
          category: "Japanese",
          location: "Busan",
          rating: 4.5,
          review_count: 100,
          image_url: "https://example.com/2.jpg",
          coordinates: [35.1, 129.0],
        },
        {
          id: "3",
          menu_name: "Menu 3",
          place_name: "Place 3",
          price: 30000,
          category: "Chinese",
          location: "Incheon",
          rating: 5.0,
          review_count: 200,
          image_url: "https://example.com/3.jpg",
          coordinates: [37.4, 126.7],
        },
      ]

      mockStorage.load
        .mockResolvedValueOnce("true")           // user-logged-out flag
        .mockResolvedValueOnce(preservedMenus)   // preserved-scraped-menus
      
      const result = await setupRootStore(rootStore)
      
      expect(rootStore.menuScrapStore.scrappedMenus.length).toBe(3)
      expect(rootStore.menuScrapStore.scrappedMenus[0].menu_name).toBe("Menu 1")
      expect(rootStore.menuScrapStore.scrappedMenus[1].menu_name).toBe("Menu 2")
      expect(rootStore.menuScrapStore.scrappedMenus[2].menu_name).toBe("Menu 3")
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Restoring 3 preserved scraped menus")
      )
      
      consoleLogSpy.mockRestore()
    })
  })

  describe("Error Handling", () => {
    it("should handle non-Error exceptions in dev mode", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
      global.__DEV__ = true
      
      mockStorage.load.mockRejectedValue("String error")
      
      const result = await setupRootStore(rootStore)
      
      expect(result.rootStore).toBe(rootStore)
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
      global.__DEV__ = false
    })
  })
})