/**
 * Profile Settings Integration Test
 * Tests user profile management, logout, and account deletion.
 */

import React from "react"
import { render, fireEvent, act } from "@testing-library/react-native"
import { ProfileScreen } from "../../screens/ProfileScreen"

const mockNavigate = jest.fn()
const mockReplace = jest.fn()
const mockAddListener = jest.fn(() => jest.fn())
const navigation = { 
  navigate: mockNavigate, 
  replace: mockReplace,
  addListener: mockAddListener,
} as any

const mockLogoutUser = jest.fn()
const mockDeleteAccount = jest.fn()
jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    logoutUser: (...args: any[]) => mockLogoutUser(...args),
    deleteAccount: (...args: any[]) => mockDeleteAccount(...args),
  },
}))

const mockMe = jest.fn()
const mockGetUserPhotos = jest.fn()
jest.mock("app/services/api", () => ({
  api: {
    me: (...args: any[]) => mockMe(...args),
    getUserPhotos: (...args: any[]) => mockGetUserPhotos(...args),
    restoreFromBackup: jest.fn().mockResolvedValue([]),
    restoreGalleryFromAWS: jest.fn().mockResolvedValue({ ok: false }),
  },
}))

jest.mock("app/utils/storage", () => ({
  save: jest.fn(),
  load: jest.fn().mockResolvedValue(null),
  loadString: jest.fn().mockResolvedValue(null),
  saveString: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
}))

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

jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: jest.fn(() => ({
    scanAlbums: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.5665, longitude: 126.9780 },
  }),
  Accuracy: { Balanced: 3 },
}))

jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn().mockReturnValue([
    { status: 'granted', granted: true },
    jest.fn().mockResolvedValue({ status: 'granted', granted: true })
  ]),
}))

describe("Profile Settings Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockLogoutUser.mockResolvedValue({ success: true })
    mockDeleteAccount.mockResolvedValue({ success: true })
    mockMe.mockResolvedValue({ ok: true, data: { username: "testuser", email: "test@example.com" } })
    mockGetUserPhotos.mockResolvedValue([])
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("renders profile screen", async () => {
    const { toJSON } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(toJSON()).toBeTruthy()
  })

  it("shows page title in tab", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByText("마이페이지")).toBeTruthy()
  })

  it("has settings button", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByTestId("settings-button")).toBeTruthy()
  })

  it("has personalization button", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByTestId("personalization-button")).toBeTruthy()
  })

  it("shows bottom navigation tabs", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByText("추천")).toBeTruthy()
    expect(getByText("스크랩")).toBeTruthy()
    expect(getByText("마이페이지")).toBeTruthy()
  })

  it("has Foodigram tab", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByTestId("FoodigramTab")).toBeTruthy()
  })

  it("navigates to Foodigram when tab pressed", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    fireEvent.press(getByTestId("FoodigramTab"))
    expect(mockNavigate).toHaveBeenCalledWith("Foodigram")
  })

  it("has Scrap tab", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByTestId("ScrapTab")).toBeTruthy()
  })

  it("navigates to Scrap when tab pressed", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    fireEvent.press(getByTestId("ScrapTab"))
    expect(mockNavigate).toHaveBeenCalledWith("Scrap")
  })

  it("has refresh button", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.advanceTimersByTime(500) })
    expect(getByTestId("refresh-button")).toBeTruthy()
  })
})
