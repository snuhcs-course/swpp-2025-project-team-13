/**
 * Navigation Tabs Integration Test
 * Tests bottom tab navigation between main screens.
 */

import React from "react"
import { render, fireEvent, act } from "@testing-library/react-native"
import { ScrapScreen } from "../../screens/ScrapScreen"
import { ProfileScreen } from "../../screens/ProfileScreen"

const mockNavigate = jest.fn()
const mockAddListener = jest.fn(() => jest.fn())
const navigation = { 
  navigate: mockNavigate,
  addListener: mockAddListener,
} as any

// Mock for both screens
jest.mock("app/models", () => ({
  useStores: () => ({
    menuScrapStore: {
      scrappedMenusList: [],
      removeScrappedMenu: jest.fn(),
    },
    foodHistoryStore: {
      historyItems: [],
      historyItemsList: [],
    },
    loadUserGalleryFromBackend: jest.fn().mockResolvedValue([]),
  }),
}))

// Mock Linking
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  canOpenURL: jest.fn(),
  openURL: jest.fn(),
}))

// Mock UserAuthFacade for ProfileScreen
jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    logoutUser: jest.fn().mockResolvedValue({ success: true }),
    deleteAccount: jest.fn().mockResolvedValue({ success: true }),
  },
}))

// Mock API for ProfileScreen - include getUserPhotos
jest.mock("app/services/api", () => ({
  api: {
    me: jest.fn().mockResolvedValue({ ok: true, data: { username: "testuser" } }),
    getUserPhotos: jest.fn().mockResolvedValue([]),
    restoreFromBackup: jest.fn().mockResolvedValue([]),
    restoreGalleryFromAWS: jest.fn().mockResolvedValue({ ok: false }),
  },
}))

// Mock storage
jest.mock("app/utils/storage", () => ({
  save: jest.fn(),
  load: jest.fn().mockResolvedValue(null),
  loadString: jest.fn().mockResolvedValue(null),
  saveString: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
}))

// Mock album scanner for ProfileScreen
jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: jest.fn(() => ({
    scanAlbums: jest.fn().mockResolvedValue([]),
  })),
}))

// Mock expo-location for ProfileScreen
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.5665, longitude: 126.9780 },
  }),
  Accuracy: { Balanced: 3 },
}))

// Mock expo-media-library for ProfileScreen
jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn().mockReturnValue([
    { status: 'granted', granted: true },
    jest.fn().mockResolvedValue({ status: 'granted', granted: true })
  ]),
}))

describe("Navigation Tabs Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe("ScrapScreen Navigation", () => {
    it("renders ScrapScreen", () => {
      const { toJSON } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(toJSON()).toBeTruthy()
    })

    it("shows all tab labels", () => {
      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("추천")).toBeTruthy()
      expect(getByText("스크랩")).toBeTruthy()
      expect(getByText("마이페이지")).toBeTruthy()
    })

    it("navigates to Foodigram", () => {
      const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      fireEvent.press(getByTestId("FoodigramTab"))
      expect(mockNavigate).toHaveBeenCalledWith("Foodigram")
    })

    it("navigates to Profile", () => {
      const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      fireEvent.press(getByTestId("UserTab"))
      expect(mockNavigate).toHaveBeenCalledWith("Profile")
    })
  })

  describe("ProfileScreen Navigation", () => {
    it("renders ProfileScreen", async () => {
      const { toJSON } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
      await act(async () => { jest.advanceTimersByTime(500) })
      expect(toJSON()).toBeTruthy()
    })

    it("shows all tab labels", async () => {
      const { getByText } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
      await act(async () => { jest.advanceTimersByTime(500) })
      expect(getByText("추천")).toBeTruthy()
      expect(getByText("스크랩")).toBeTruthy()
      expect(getByText("마이페이지")).toBeTruthy()
    })

    it("navigates to Foodigram", async () => {
      const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
      await act(async () => { jest.advanceTimersByTime(500) })
      fireEvent.press(getByTestId("FoodigramTab"))
      expect(mockNavigate).toHaveBeenCalledWith("Foodigram")
    })

    it("navigates to Scrap", async () => {
      const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
      await act(async () => { jest.advanceTimersByTime(500) })
      fireEvent.press(getByTestId("ScrapTab"))
      expect(mockNavigate).toHaveBeenCalledWith("Scrap")
    })
  })
})
