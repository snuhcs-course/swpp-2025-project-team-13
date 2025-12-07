import * as modelsIndex from "./index"

describe("models index", () => {
  it("should export all necessary types and models", () => {
    // Check that all expected exports are available
    expect(modelsIndex.RootStoreModel).toBeDefined()
    expect(modelsIndex.setupRootStore).toBeDefined()
    expect(modelsIndex.useStores).toBeDefined()
    expect(modelsIndex.useInitialRootStore).toBeDefined()
    expect(modelsIndex.RootStoreProvider).toBeDefined()
    expect(modelsIndex.FoodHistoryStoreModel).toBeDefined()
    expect(modelsIndex.FoodItemModel).toBeDefined()
    expect(modelsIndex.getRootStore).toBeDefined()
  })

  it("should provide working exports", () => {
    const { RootStoreModel, useStores, FoodHistoryStoreModel } = modelsIndex
    
    // Test that RootStoreModel can create an instance
    const store = RootStoreModel.create()
    expect(store).toBeDefined()
    expect(store.foodHistoryStore).toBeDefined()
    
    // Test that useStores is a function
    expect(typeof useStores).toBe("function")
    
    // Test that FoodHistoryStoreModel can create an instance
    const foodStore = FoodHistoryStoreModel.create()
    expect(foodStore).toBeDefined()
    expect(foodStore.scrappedItems).toBeDefined()
  })

  it("should export all expected interfaces and types", () => {
    // Ensure all expected exports are present
    const expectedExports = [
      'RootStoreModel', 'FoodHistoryStoreModel', 'FoodItemModel',
      'getRootStore', 'useStores', 'useInitialRootStore', 
      'RootStoreProvider', 'setupRootStore'
    ]
    
    expectedExports.forEach(exportName => {
      expect(modelsIndex).toHaveProperty(exportName)
    })
  })

  it("should allow creating a complete store setup using index exports", () => {
    const { RootStoreModel, FoodHistoryStoreModel, getRootStore } = modelsIndex
    
    // Create a root store with food history
    const rootStore = RootStoreModel.create({
      foodHistoryStore: FoodHistoryStoreModel.create({
        scrappedItems: []
      })
    })
    
    // Test that getRootStore works with the created store
    const retrievedRoot = getRootStore(rootStore.foodHistoryStore)
    expect(retrievedRoot).toBe(rootStore)
    
    // Test basic functionality through index exports
    rootStore.foodHistoryStore.addScrappedItem({
      id: "1",
      name: "Test Item",
      distance: "1.0 km",
      image: "test.jpg",
      keywords: ["test"],
      category: "restaurant",
      allergens: []
    })
    
    expect(rootStore.foodHistoryStore.isScrapped("1")).toBe(true)
    expect(rootStore.foodHistoryStore.scrappedItemsList.length).toBe(1)
  })

  it("should validate models export helper function", () => {
    const { validateModelsExport } = modelsIndex
    
    expect(validateModelsExport).toBeDefined()
    expect(typeof validateModelsExport).toBe("function")
    expect(validateModelsExport()).toBe(true)
  })
})