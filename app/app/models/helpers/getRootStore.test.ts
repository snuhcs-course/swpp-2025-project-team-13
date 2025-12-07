import { types } from "mobx-state-tree"
import { getRootStore } from "./getRootStore"
import { RootStoreModel } from "../RootStore"
import { FoodHistoryStoreModel } from "../FoodHistoryStore"

describe("getRootStore", () => {
  it("should return root store from a child store", () => {
    const rootStore = RootStoreModel.create()
    const childStore = rootStore.foodHistoryStore
    
    const retrievedRootStore = getRootStore(childStore)
    
    expect(retrievedRootStore).toBe(rootStore)
    expect(retrievedRootStore.foodHistoryStore).toBe(childStore)
  })

  it("should return root store from deeply nested child", () => {
    // Create a test model with nested structure
    const NestedModel = types.model("Nested").props({
      value: types.string
    })

    const ParentModel = types.model("Parent").props({
      nested: NestedModel
    })

    const TestRootModel = types.model("TestRoot").props({
      parent: ParentModel
    })

    const testRoot = TestRootModel.create({
      parent: {
        nested: {
          value: "test"
        }
      }
    })

    const nestedChild = testRoot.parent.nested
    const retrievedRoot = getRootStore(nestedChild)
    
    expect(retrievedRoot).toBe(testRoot)
  })

  it("should work with food item in food history store", () => {
    const rootStore = RootStoreModel.create()
    const testItem = {
      id: "1",
      name: "Pizza",
      distance: "1.2 km",
      image: "pizza.jpg",
      keywords: ["pizza"],
      category: "restaurant",
      allergens: ["gluten"]
    }

    rootStore.foodHistoryStore.addScrappedItem(testItem)
    const foodItem = rootStore.foodHistoryStore.scrappedItems[0]
    
    const retrievedRootStore = getRootStore(foodItem)
    
    expect(retrievedRootStore).toBe(rootStore)
    expect(retrievedRootStore.foodHistoryStore.scrappedItems[0]).toBe(foodItem)
  })
})