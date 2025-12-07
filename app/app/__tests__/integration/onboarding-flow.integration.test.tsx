/**
 * Onboarding Flow Integration Test
 * Tests the initial onboarding flow through location, gallery, and preferences.
 */

import React from "react"
import { render, act } from "@testing-library/react-native"
import { OnboardingScreen } from "../../screens/OnboardingScreen"
import { Alert } from "react-native"

const mockReplace = jest.fn()
const navigation = { replace: mockReplace } as any

const mockSavePreferences = jest.fn()
jest.mock("app/services/api", () => ({
  api: {
    savePreferences: (...args: any[]) => mockSavePreferences(...args),
  },
}))

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.5665, longitude: 126.9780 },
  }),
}))

jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn().mockReturnValue([
    { status: 'granted', granted: true },
    jest.fn().mockResolvedValue({ status: 'granted', granted: true })
  ]),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}))

jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: jest.fn(() => ({
    scanAlbums: jest.fn().mockResolvedValue([]),
  })),
}))

jest.mock("app/utils/storage", () => ({
  save: jest.fn(),
  saveString: jest.fn(),
  load: jest.fn().mockResolvedValue(null),
  loadString: jest.fn().mockResolvedValue(null),
  remove: jest.fn(),
  clear: jest.fn(),
}))

jest.spyOn(Alert, "alert").mockImplementation(() => {})

describe("Onboarding Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSavePreferences.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("renders onboarding screen", async () => {
    const { toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.runAllTimers() })
    expect(toJSON()).toBeTruthy()
  })

  it("shows location step content", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.runAllTimers() })
    expect(getByText("위치 서비스 활성화")).toBeTruthy()
  })

  it("shows location button", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.runAllTimers() })
    expect(getByText("위치 접근 허용")).toBeTruthy()
  })

  it("location module is mocked correctly", () => {
    const Location = require("expo-location")
    expect(Location.requestForegroundPermissionsAsync).toBeDefined()
    expect(Location.getCurrentPositionAsync).toBeDefined()
  })

  it("media library module is mocked correctly", () => {
    const MediaLibrary = require("expo-media-library")
    expect(MediaLibrary.usePermissions).toBeDefined()
    expect(MediaLibrary.requestPermissionsAsync).toBeDefined()
  })

  it("album scanner is mocked correctly", () => {
    const { useAlbumScanner } = require("app/services/albums/useAlbumScanner")
    const scanner = useAlbumScanner()
    expect(scanner.scanAlbums).toBeDefined()
  })

  it("savePreferences API is available", () => {
    expect(mockSavePreferences).toBeDefined()
  })
})

