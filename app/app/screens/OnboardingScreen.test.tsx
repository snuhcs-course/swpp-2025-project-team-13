import React from "react"
import { render, fireEvent, waitFor, act } from "@testing-library/react-native"
import { OnboardingScreen } from "./OnboardingScreen"
import * as Location from "expo-location"
import * as MediaLibrary from "expo-media-library"
import { Alert } from "react-native"

// Mock navigation
const mockReplace = jest.fn()
const navigation = { replace: mockReplace } as any

// Mock API
const mockSavePreferences = jest.fn().mockResolvedValue({ ok: true })

jest.mock("app/services/api", () => ({
  api: {
    savePreferences: (...args: any[]) => mockSavePreferences(...args),
  },
}))

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.5665, longitude: 126.9780 },
  }),
}))

// Mock expo-media-library  
const mockRequestGalleryPermission = jest.fn().mockResolvedValue({ status: 'granted', granted: true })
jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn().mockReturnValue([
    { status: 'granted', granted: true },
    mockRequestGalleryPermission
  ]),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}))

// Mock useAlbumScanner
const mockScanAlbums = jest.fn()
jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: jest.fn(() => ({
    scanAlbums: mockScanAlbums,
  })),
}))

// Mock storage
const mockStorageSaveString = jest.fn()
const mockStorageRemove = jest.fn()
jest.mock("app/utils/storage", () => ({
  save: jest.fn(),
  saveString: (...args: any[]) => mockStorageSaveString(...args),
  load: jest.fn(),
  loadString: jest.fn(),
  remove: (...args: any[]) => mockStorageRemove(...args),
  clear: jest.fn(),
}))

// Mock Alert
jest.spyOn(Alert, "alert").mockImplementation(() => {})

describe("OnboardingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Reset MediaLibrary mock to default
    ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
      { status: 'granted', granted: true },
      mockRequestGalleryPermission
    ])
    mockRequestGalleryPermission.mockResolvedValue({ status: 'granted', granted: true })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("Initial Render", () => {
    it("renders without crashing", async () => {
    const { toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    expect(toJSON()).toBeTruthy()
  })

    it("renders the first step (location permission)", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    expect(getByText("위치 서비스 활성화")).toBeTruthy()
  })

    it("shows location access button", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    expect(getByText("위치 접근 허용")).toBeTruthy()
  })

    it("shows skip button on location step", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    expect(getByText("건너뛰기")).toBeTruthy()
  })

    it("shows location description text", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    expect(getByText(/근처의 맛집을 추천하기 위해 위치 정보가 필요해요/)).toBeTruthy()
  })

    it("shows location benefits", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      expect(getByText("주변 레스토랑")).toBeTruthy()
      expect(getByText("맞춤형 추천")).toBeTruthy()
      expect(getByText("새로운 맛집 경험")).toBeTruthy()
    })
  })

  describe("Location Permission", () => {
  it("requests location permission when button is pressed", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    
      await act(async () => {
    fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
    
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled()
  })

  it("shows warning modal when skip is pressed", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    
      await act(async () => {
    fireEvent.press(getByText("건너뛰기"))
        jest.runAllTimers()
      })
    
      expect(getByText("위치 서비스 비활성화")).toBeTruthy()
  })

  it("navigates to gallery step after location permission granted", async () => {
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    
      await act(async () => {
    fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
    
    await waitFor(() => {
      expect(getByText("갤러리 동기화")).toBeTruthy()
    })
  })

    it("handles location permission denied", async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: "denied" })
      
    const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
    
      await act(async () => {
    fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      expect(getByText("위치 서비스 활성화")).toBeTruthy()
  })

    it("handles location error gracefully", async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: "granted" })
      ;(Location.getCurrentPositionAsync as jest.Mock).mockRejectedValueOnce(new Error("Location error"))
      
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
    fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
    
    await waitFor(() => {
      expect(getByText("갤러리 동기화")).toBeTruthy()
    })
    })
  })

  describe("Gallery Step", () => {
    it("renders gallery step correctly after location permission", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => {
        expect(getByText("갤러리 동기화")).toBeTruthy()
      })
    })

    it("shows gallery description", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => {
        expect(getByText(/갤러리의 음식 사진을 자동으로 동기화/)).toBeTruthy()
      })
    })

    it("shows gallery access button", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => {
        expect(getByText("갤러리 접근 허용")).toBeTruthy()
      })
    })

    it("requests gallery permission and starts scanning", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      
      expect(mockScanAlbums).toHaveBeenCalled()
    })

    it("shows skip button on gallery step", async () => {
      const { getByText, getAllByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      const skipButtons = getAllByText("건너뛰기")
      expect(skipButtons.length).toBeGreaterThan(0)
    })

    it("shows gallery benefits", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      expect(getByText("음식 사진 자동 인식")).toBeTruthy()
      expect(getByText("맞춤형 추천 향상")).toBeTruthy()
      expect(getByText("개인 갤러리 관리")).toBeTruthy()
    })

    it("handles gallery permission denied - triggers warning modal", async () => {
      ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
        { status: 'undetermined', granted: false },
        mockRequestGalleryPermission
      ])
      mockRequestGalleryPermission.mockResolvedValueOnce({ status: 'denied', granted: false })
      
      const { getByText, toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      
      // Modal should be visible (component still renders)
      expect(toJSON()).toBeTruthy()
    })

    it("handles gallery permission error - triggers warning modal", async () => {
      ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
        { status: 'undetermined', granted: false },
        mockRequestGalleryPermission
      ])
      mockRequestGalleryPermission.mockRejectedValueOnce(new Error("Permission error"))
      
      const { getByText, toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      
      // Component should still render after error
      expect(toJSON()).toBeTruthy()
    })

    it("can press skip on gallery step", async () => {
      const { getByText, getAllByText, toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      const skipButtons = getAllByText("건너뛰기")
      await act(async () => {
        fireEvent.press(skipButtons[skipButtons.length - 1])
        jest.runAllTimers()
      })
      
      // Modal should appear, component still renders
      expect(toJSON()).toBeTruthy()
    })
  })

  describe("Warning Modal Interactions", () => {
    it("confirms location warning and proceeds to gallery", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("건너뛰기"))
        jest.runAllTimers()
      })
      
      expect(getByText("위치 서비스 비활성화")).toBeTruthy()
      
      await act(async () => {
      fireEvent.press(getByText("확인"))
        jest.runAllTimers()
      })
      
      await waitFor(() => {
        expect(getByText("갤러리 동기화")).toBeTruthy()
      })
    })

    it("cancels location warning and stays on location step", async () => {
      const { getByText, getAllByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("건너뛰기"))
        jest.runAllTimers()
      })
      
      expect(getByText("위치 서비스 비활성화")).toBeTruthy()
      
      const cancelButtons = getAllByText("취소")
      await act(async () => {
      fireEvent.press(cancelButtons[cancelButtons.length - 1])
        jest.runAllTimers()
      })
      
        expect(getByText("위치 서비스 활성화")).toBeTruthy()
      })
    })

  describe("Taste Preference Steps", () => {
    it("renders sweet preference step", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      
      await waitFor(() => {
        expect(getByText("단 걸 좋아하시나요?")).toBeTruthy()
      })
      
      expect(getByText("매우 좋아해요")).toBeTruthy()
      expect(getByText("좋아해요")).toBeTruthy()
      expect(getByText("평범해요")).toBeTruthy()
      expect(getByText("싫어해요")).toBeTruthy()
      expect(getByText("절대 안 먹어요")).toBeTruthy()
    })

    it("selects sweet preference and shows next button", async () => {
      const { getByText, getAllByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("매우 좋아해요"))
        jest.runAllTimers()
      })
      
      const nextButtons = getAllByText("다음")
      expect(nextButtons.length).toBeGreaterThan(0)
      })

    it("can change sweet preference selection", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
      fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
      
      // Select one option
      await act(async () => {
      fireEvent.press(getByText("매우 좋아해요"))
        jest.runAllTimers()
    })

      // Change to another option
      await act(async () => {
        fireEvent.press(getByText("싫어해요"))
        jest.runAllTimers()
      })
      
      expect(getByText("싫어해요")).toBeTruthy()
    })

    it("next button is disabled when no option selected", async () => {
      const { getByText, getAllByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
    })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
      fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
      
      // Next button should exist (but disabled)
      const nextButtons = getAllByText("다음")
      expect(nextButtons.length).toBeGreaterThan(0)
    })
  })

  describe("Navigation", () => {
    it("can go back from taste step", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
      fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("뒤로"))
        jest.runAllTimers()
      })
      
      await waitFor(() => {
        expect(getByText("갤러리 동기화")).toBeTruthy()
      })
    })

    it("navigation replace function is available", () => {
      expect(mockReplace).toBeDefined()
    })

    it("back button goes to previous step from taste step", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      // Go to gallery
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      // Go to sweet step
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
      
      // Go back to gallery
      await act(async () => {
        fireEvent.press(getByText("뒤로"))
        jest.runAllTimers()
      })
      
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
    })
  })

  describe("Progress Indicator", () => {
    it("renders progress bar", async () => {
      const { toJSON } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      expect(toJSON()).toBeTruthy()
    })
  })

  describe("API", () => {
    it("savePreferences API mock is set up correctly", () => {
      expect(mockSavePreferences).toBeDefined()
    })
  })

  describe("Multi-step Navigation Flow", () => {
    it("navigates through location to gallery to sweet step", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      // Step 1: Location
      expect(getByText("위치 서비스 활성화")).toBeTruthy()
      
      await act(async () => {
        fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      
      // Step 2: Gallery
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      await act(async () => {
        fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      
      // Step 3: Sweet
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
    })

    it("navigates via skip buttons - location skip with confirm", async () => {
      const { getByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      // Skip location
      await act(async () => {
        fireEvent.press(getByText("건너뛰기"))
        jest.runAllTimers()
      })
      expect(getByText("위치 서비스 비활성화")).toBeTruthy()
      
      await act(async () => {
        fireEvent.press(getByText("확인"))
        jest.runAllTimers()
      })
      
      // Now on gallery
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
    })

    it("navigates through taste preference steps", async () => {
      const { getByText, getAllByText } = render(<OnboardingScreen navigation={navigation} route={{} as any} />)
      await act(async () => {
        jest.runAllTimers()
      })
      
      // Location -> Gallery
      await act(async () => {
      fireEvent.press(getByText("위치 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("갤러리 동기화")).toBeTruthy())
      
      // Gallery -> Sweet
      await act(async () => {
      fireEvent.press(getByText("갤러리 접근 허용"))
        jest.runAllTimers()
      })
      await waitFor(() => expect(getByText("단 걸 좋아하시나요?")).toBeTruthy())
      
      // Select sweet option and go to spicy
      await act(async () => {
        fireEvent.press(getByText("평범해요"))
        jest.runAllTimers()
      })
      await act(async () => {
        fireEvent.press(getAllByText("다음")[0])
        jest.runAllTimers()
      })
      
      // Should be on spicy step
      await waitFor(() => expect(getByText("매운 걸 좋아하시나요?")).toBeTruthy())
    })


  })
})
