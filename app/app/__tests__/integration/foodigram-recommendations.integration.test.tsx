/**
 * Foodigram Recommendations Integration Test
 * Tests the food recommendation system and restaurant display.
 */

import React from "react"
import { render, act } from "@testing-library/react-native"
import { FoodigramScreen } from "../../screens/FoodigramScreen"

const mockNavigate = jest.fn()
const mockAddListener = jest.fn(() => jest.fn())
const navigation = { navigate: mockNavigate, addListener: mockAddListener } as any
const defaultRoute = { params: undefined }

jest.mock("app/models", () => ({
  useStores: () => ({
    foodHistoryStore: {
      scrappedItems: [],
      scrappedItemsList: [],
      toggleScrappedItem: jest.fn(),
    },
    menuScrapStore: {
      scrappedMenus: [],
      scrappedMenusList: [],
      addScrappedMenu: jest.fn(),
      removeScrappedMenu: jest.fn(),
      isScrapped: jest.fn().mockReturnValue(false),
      toggleScrappedMenu: jest.fn(),
    },
  }),
}))

const mockGetMenuRecommendationsPhase1 = jest.fn()
jest.mock("app/services/api", () => ({
  api: {
    getScraps: jest.fn(() => Promise.resolve({ ok: true, data: [] })),
    getMenuRecommendations: jest.fn(),
    getMenuRecommendationsPhase1: (...args: any[]) => mockGetMenuRecommendationsPhase1(...args),
    getMenuRecommendationsPhase2: jest.fn(),
    toggleScrapWithName: jest.fn(),
  },
}))

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.5665, longitude: 126.9780 },
  }),
  Accuracy: { Balanced: 3 },
}))

jest.mock("app/data/mockData", () => ({
  friends: [],
  allCategories: ["Korean", "Japanese", "Chinese"],
  allAllergens: ["Peanuts", "Shellfish"],
}))

jest.mock("app/utils/storage", () => ({
  save: jest.fn(),
  load: jest.fn().mockResolvedValue(null),
  loadString: jest.fn().mockImplementation((key: string) => {
    // Return 'true' for location permission to trigger actual location check
    if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true")
    if (key === "USE_DUMMY_LOCATION") return Promise.resolve("false")
    return Promise.resolve(null)
  }),
  saveString: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
}))

describe("Foodigram Recommendations Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockGetMenuRecommendationsPhase1.mockResolvedValue({ success: true, results: [] })
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("renders Foodigram screen", async () => {
    const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute as any} />)
    await act(async () => { jest.advanceTimersByTime(100) })
    expect(toJSON()).toBeTruthy()
  })

  it("shows bottom navigation tabs", async () => {
    const { getByText } = render(<FoodigramScreen navigation={navigation} route={defaultRoute as any} />)
    await act(async () => { jest.advanceTimersByTime(100) })
    expect(getByText("추천")).toBeTruthy()
    expect(getByText("스크랩")).toBeTruthy()
    expect(getByText("마이페이지")).toBeTruthy()
  })

  it("calls API for recommendations", async () => {
    render(<FoodigramScreen navigation={navigation} route={defaultRoute as any} />)
    await act(async () => { jest.advanceTimersByTime(600) })
    expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled()
  })

  it("handles empty recommendations", async () => {
    mockGetMenuRecommendationsPhase1.mockResolvedValue({ success: true, results: [] })
    const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute as any} />)
    await act(async () => { jest.advanceTimersByTime(600) })
    expect(toJSON()).toBeTruthy()
  })

  it("handles API error gracefully", async () => {
    mockGetMenuRecommendationsPhase1.mockRejectedValue(new Error("API Error"))
    const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute as any} />)
    await act(async () => { jest.advanceTimersByTime(600) })
    expect(toJSON()).toBeTruthy()
  })

  it("uses location service", async () => {
    const Location = require("expo-location")
    render(<FoodigramScreen navigation={navigation} route={defaultRoute as any} />)
    // Need more time for async storage reads and location check
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(Location.getForegroundPermissionsAsync).toHaveBeenCalled()
  })

  it("stores are initialized", () => {
    const { useStores } = require("app/models")
    const stores = useStores()
    expect(stores.menuScrapStore).toBeDefined()
    expect(stores.foodHistoryStore).toBeDefined()
  })
})

