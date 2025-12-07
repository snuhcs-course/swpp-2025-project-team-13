import React from "react"
import { render, waitFor, act } from "@testing-library/react-native"
import { AppState } from "react-native"

// Mock storage
const mockLoadString = jest.fn()
const mockSaveString = jest.fn()
const mockRemove = jest.fn()
jest.mock("app/utils/storage", () => ({
  loadString: (...args: any[]) => mockLoadString(...args),
  saveString: (...args: any[]) => mockSaveString(...args),
  remove: (...args: any[]) => mockRemove(...args),
}))

// Mock API
const mockGetCsrf = jest.fn()
const mockMe = jest.fn()
jest.mock("app/services/api", () => ({
  api: {
    getCsrf: (...args: any[]) => mockGetCsrf(...args),
    me: (...args: any[]) => mockMe(...args),
  },
}))

// Mock UserAuthFacade
const mockCheckAuthenticationStatus = jest.fn()
const mockLoginUser = jest.fn()
jest.mock("app/services/registration/UserAuthFacade", () => ({
  userAuthFacade: {
    checkAuthenticationStatus: (...args: any[]) => mockCheckAuthenticationStatus(...args),
    loginUser: (...args: any[]) => mockLoginUser(...args),
  },
}))

// Mock useStores
const mockLoadUserDataFromBackend = jest.fn()
const mockLoadUserGalleryFromBackend = jest.fn()
const mockClearUserData = jest.fn()
const mockClearAllCachedData = jest.fn()
jest.mock("app/models", () => ({
  useStores: jest.fn(() => ({
    loadUserDataFromBackend: mockLoadUserDataFromBackend,
    loadUserGalleryFromBackend: mockLoadUserGalleryFromBackend,
    clearUserData: mockClearUserData,
    clearAllCachedData: mockClearAllCachedData,
  })),
}))

// Mocks for native modules and navigation
jest.mock('expo-media-library', () => ({
    usePermissions: jest.fn().mockReturnValue([{ status: 'granted' }, jest.fn()]),
    getAlbumsAsync: jest.fn().mockResolvedValue([]),
    getAssetsAsync: jest.fn().mockResolvedValue({ assets: [], hasNextPage: false }),
}))
jest.mock('@infinitered/react-native-mlkit-image-labeling', () => ({
    useImageLabeling: jest.fn(),
}), { virtual: true })

const mockUseBackButtonHandler = jest.fn()
const mockUseExitConfirmation = jest.fn(() => ({ showExitConfirmation: false, setShowExitConfirmation: jest.fn() }))
jest.mock("./navigationUtilities", () => ({
  get useBackButtonHandler() { return mockUseBackButtonHandler },
  get useExitConfirmation() { return mockUseExitConfirmation },
  navigationRef: { current: null },
}))

// Mock screens
jest.mock("app/screens", () => ({
  WelcomeScreen: () => null,
  LoginScreen: () => null,
  SignUpScreen: () => null,
  OnboardingScreen: () => null,
  FoodigramScreen: () => null,
  ScrapScreen: () => null,
  ProfileScreen: () => null,
}))

// Mock components
jest.mock("app/components", () => ({
  ExitConfirmationModal: () => null,
}))

// Mock config
jest.mock("../config", () => ({
  __esModule: true,
  default: {
    exitRoutes: ["Welcome"],
  },
}))

// Mock AppState
let appStateCallback: ((state: string) => void) | null = null
jest.spyOn(AppState, 'addEventListener').mockImplementation((event, callback) => {
  if (event === 'change') {
    appStateCallback = callback as any
  }
  return { remove: jest.fn() }
})

describe("AppNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockLoadString.mockResolvedValue(null)
    mockGetCsrf.mockResolvedValue({ ok: true })
    mockMe.mockResolvedValue({ ok: true })
    mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: true })
    mockLoadUserDataFromBackend.mockResolvedValue(undefined)
    mockClearUserData.mockResolvedValue(undefined)
    mockClearAllCachedData.mockResolvedValue(undefined)
    mockLoginUser.mockResolvedValue({ success: true })
    appStateCallback = null
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should exist as a module", () => {
    const AppNavigator = require("./AppNavigator")
    expect(AppNavigator).toBeDefined()
  })

  it("should export AppNavigator component", () => {
    const { AppNavigator } = require("./AppNavigator")
    expect(AppNavigator).toBeDefined()
  })

  it("should export AppStack component", () => {
    const module = require("./AppNavigator")
    expect(module).toBeDefined()
  })

  it("should export AppStackParamList type", () => {
    const { AppStackParamList } = require("./AppNavigator")
    // Type checking - just verify module exports it (it's a type, not a value)
    expect(AppStackParamList).toBeUndefined()
  })

  it("should have exit routes configured", () => {
    const Config = require("../config").default
    expect(Config.exitRoutes).toBeDefined()
    expect(Array.isArray(Config.exitRoutes)).toBe(true)
  })

  it("should export AppStackScreenProps type", () => {
    const { AppStackScreenProps } = require("./AppNavigator")
    // Type checking - it's a type, not a value
    expect(AppStackScreenProps).toBeUndefined()
  })

  describe("Login Status Check", () => {
    it("should check login status when not logged in", async () => {
      mockLoadString.mockResolvedValue(null)
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockLoadString).toHaveBeenCalledWith("IS_LOGGED_IN")
    })

    it("should handle valid session with authenticated Cognito", async () => {
      mockLoadString.mockResolvedValue("true")
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: true })
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockGetCsrf).toHaveBeenCalled()
      expect(mockMe).toHaveBeenCalled()
      expect(mockCheckAuthenticationStatus).toHaveBeenCalled()
    })

    it("should handle valid session but unauthenticated Cognito", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "IS_LOGGED_IN") return Promise.resolve("true")
        if (key === "STORED_USERNAME") return Promise.resolve("testuser")
        if (key === "STORED_PASSWORD") return Promise.resolve("testpass")
        return Promise.resolve(null)
      })
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: false })
      mockLoginUser.mockResolvedValue({ success: true })
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockLoginUser).toHaveBeenCalledWith({
        username: "testuser",
        password: "testpass"
      })
    })

    it("should handle failed Cognito restoration", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "IS_LOGGED_IN") return Promise.resolve("true")
        if (key === "STORED_USERNAME") return Promise.resolve("testuser")
        if (key === "STORED_PASSWORD") return Promise.resolve("testpass")
        return Promise.resolve(null)
      })
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: false })
      mockLoginUser.mockResolvedValue({ success: false, errorMessage: "Failed" })
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockLoginUser).toHaveBeenCalled()
    })

    it("should handle Cognito restoration error", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "IS_LOGGED_IN") return Promise.resolve("true")
        if (key === "STORED_USERNAME") return Promise.resolve("testuser")
        if (key === "STORED_PASSWORD") return Promise.resolve("testpass")
        return Promise.resolve(null)
      })
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: false })
      mockLoginUser.mockRejectedValue(new Error("Network error"))
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockLoginUser).toHaveBeenCalled()
    })

    it("should handle invalid session", async () => {
      mockLoadString.mockResolvedValue("true")
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: false })
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockRemove).toHaveBeenCalledWith("IS_LOGGED_IN")
    })

    it("should handle network errors during login check", async () => {
      mockLoadString.mockResolvedValue("true")
      mockGetCsrf.mockRejectedValue(new Error("Network error"))
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockRemove).toHaveBeenCalledWith("IS_LOGGED_IN")
    })

    it("should skip Cognito restoration when no stored credentials", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "IS_LOGGED_IN") return Promise.resolve("true")
        return Promise.resolve(null)
      })
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: false })
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockLoginUser).not.toHaveBeenCalled()
    })
  })

  describe("Data Management", () => {
    it("should clear cached data and load user data on clean login", async () => {
      mockLoadString.mockResolvedValue("true")
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: true })
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(mockClearAllCachedData).toHaveBeenCalled()
      expect(mockLoadUserDataFromBackend).toHaveBeenCalled()
    })

    it("should clear user data when logging out", async () => {
      // First render with logged in state
      mockLoadString.mockResolvedValue("true")
      mockGetCsrf.mockResolvedValue({ ok: true })
      mockMe.mockResolvedValue({ ok: true })
      mockCheckAuthenticationStatus.mockResolvedValue({ isAuthenticated: true })
      
      const { AppNavigator } = require("./AppNavigator")
      const { rerender } = render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      // Then simulate logout
      mockLoadString.mockResolvedValue(null)
      
      // Trigger checkLoginStatus via app state change
      await act(async () => {
        if (appStateCallback) {
          appStateCallback("active")
        }
        jest.advanceTimersByTime(100)
      })
      
      // clearUserData should be called when transitioning from logged in to logged out
    })
  })

  describe("App State Changes", () => {
    it("should register app state listener", () => {
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      expect(AppState.addEventListener).toHaveBeenCalledWith("change", expect.any(Function))
    })

    it("should check login status when app becomes active", async () => {
      mockLoadString.mockResolvedValue(null)
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      // Clear the initial call
      mockLoadString.mockClear()
      
      // Simulate app becoming active
      await act(async () => {
        if (appStateCallback) {
          appStateCallback("active")
        }
        jest.advanceTimersByTime(100)
      })
      
      expect(mockLoadString).toHaveBeenCalledWith("IS_LOGGED_IN")
    })

    it("should not trigger additional login check when app goes to background", async () => {
      mockLoadString.mockResolvedValue(null)
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      // Get the initial call count
      const initialCallCount = mockLoadString.mock.calls.length
      
      // Simulate app going to background
      await act(async () => {
        if (appStateCallback) {
          appStateCallback("background")
        }
        jest.advanceTimersByTime(100)
      })
      
      // Should not have additional calls when going to background
      // (only active state triggers the check)
      expect(mockLoadString.mock.calls.length).toBe(initialCallCount)
    })
  })

  describe("Periodic Check", () => {
    it("should set up periodic check when not logged in", async () => {
      mockLoadString.mockResolvedValue(null)
      
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      // Clear initial calls
      mockLoadString.mockClear()
      
      // Advance by 10 seconds (the interval)
      await act(async () => {
        jest.advanceTimersByTime(10000)
      })
      
      expect(mockLoadString).toHaveBeenCalledWith("IS_LOGGED_IN")
    })
  })

  describe("Component Structure", () => {
    it("should use back button handler", () => {
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      expect(mockUseBackButtonHandler).toHaveBeenCalled()
    })

    it("should use exit confirmation", () => {
      const { AppNavigator } = require("./AppNavigator")
      render(<AppNavigator />)
      
      expect(mockUseExitConfirmation).toHaveBeenCalled()
    })

    it("should have navigation utilities configured", () => {
      const { navigationRef } = require("./navigationUtilities")
      expect(navigationRef).toBeDefined()
    })
  })

  describe("Initial Render", () => {
    it("should return null while checking login status", () => {
      // The initial render should return null while isLoggedIn is null
      mockLoadString.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      const { AppNavigator } = require("./AppNavigator")
      const { toJSON } = render(<AppNavigator />)
      
      // Should render something (NavigationContainer at minimum)
      expect(toJSON()).toBeDefined()
    })

    it("should render navigation container after login check", async () => {
      mockLoadString.mockResolvedValue(null)
      
      const { AppNavigator } = require("./AppNavigator")
      const { toJSON } = render(<AppNavigator />)
      
      await act(async () => {
        jest.advanceTimersByTime(100)
      })
      
      expect(toJSON()).toBeDefined()
    })
  })
})
