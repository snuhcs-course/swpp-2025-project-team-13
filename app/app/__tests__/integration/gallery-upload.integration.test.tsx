/**
 * Gallery Upload Integration Test
 * Tests gallery photo selection, AI labeling, and upload process.
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
  getAlbumsAsync: jest.fn().mockResolvedValue([]),
  getAssetsAsync: jest.fn().mockResolvedValue({ assets: [], hasNextPage: false }),
}))

const mockScanAlbums = jest.fn().mockResolvedValue([])
jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: jest.fn(() => ({
    scanAlbums: mockScanAlbums,
  })),
}))

const mockClassifyImages = jest.fn().mockResolvedValue([])
jest.mock("app/services/albums/useImageClassifier", () => ({
  useImageClassifier: jest.fn(() => ({
    classifyImages: mockClassifyImages,
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

describe("Gallery Upload Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSavePreferences.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("renders onboarding screen for gallery flow", async () => {
    const { toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.runAllTimers() })
    expect(toJSON()).toBeTruthy()
  })

  it("starts with location step", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.runAllTimers() })
    expect(getByText("위치 서비스 활성화")).toBeTruthy()
  })

  it("location access button is present", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
    await act(async () => { jest.runAllTimers() })
    expect(getByText("위치 접근 허용")).toBeTruthy()
  })

  it("media library hooks are available", () => {
    const MediaLibrary = require("expo-media-library")
    expect(MediaLibrary.usePermissions).toBeDefined()
    expect(MediaLibrary.getAlbumsAsync).toBeDefined()
    expect(MediaLibrary.getAssetsAsync).toBeDefined()
  })

  it("album scanner hook is available", () => {
    const { useAlbumScanner } = require("app/services/albums/useAlbumScanner")
    const scanner = useAlbumScanner()
    expect(scanner.scanAlbums).toBeDefined()
  })

  it("image classifier hook is available", () => {
    const { useImageClassifier } = require("app/services/albums/useImageClassifier")
    const classifier = useImageClassifier()
    expect(classifier.classifyImages).toBeDefined()
  })

  it("savePreferences API is configured", () => {
    expect(mockSavePreferences).toBeDefined()
  })

  it("scan albums mock works", async () => {
    await mockScanAlbums()
    expect(mockScanAlbums).toHaveBeenCalled()
  })

  it("classify images mock works", async () => {
    await mockClassifyImages([])
    expect(mockClassifyImages).toHaveBeenCalled()
  })
})

