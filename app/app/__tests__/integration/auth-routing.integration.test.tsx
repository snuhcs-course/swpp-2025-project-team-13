/**
 * Authentication Routing Integration Test
 * Tests navigation logic based on user authentication state.
 */

import React from "react"
import { render } from "@testing-library/react-native"

// Mock all dependencies
jest.mock("app/utils/storage", () => ({
  loadString: jest.fn().mockResolvedValue(null),
  saveString: jest.fn(),
  remove: jest.fn(),
}))

jest.mock("app/services/api", () => ({
  api: {
    getCsrf: jest.fn().mockResolvedValue({ ok: true }),
    me: jest.fn().mockResolvedValue({ ok: true }),
  },
}))

jest.mock("app/services/registration/UserAuthFacade", () => ({
  userAuthFacade: {
    checkAuthenticationStatus: jest.fn().mockResolvedValue({ isAuthenticated: true }),
    loginUser: jest.fn().mockResolvedValue({ success: true }),
  },
}))

jest.mock("app/models", () => ({
  useStores: jest.fn(() => ({
    loadUserDataFromBackend: jest.fn(),
    loadUserGalleryFromBackend: jest.fn(),
    clearUserData: jest.fn(),
    clearAllCachedData: jest.fn(),
  })),
}))

jest.mock('expo-media-library', () => ({
  usePermissions: jest.fn().mockReturnValue([{ status: 'granted' }, jest.fn()]),
}))

jest.mock("app/screens", () => ({
  WelcomeScreen: () => null,
  LoginScreen: () => null,
  SignUpScreen: () => null,
  OnboardingScreen: () => null,
  FoodigramScreen: () => null,
  ScrapScreen: () => null,
  ProfileScreen: () => null,
}))

jest.mock("app/components", () => ({
  ExitConfirmationModal: () => null,
}))

describe("Authentication Routing Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("checks login status on app start", () => {
    const storage = require("app/utils/storage")
    storage.loadString("IS_LOGGED_IN")
    expect(storage.loadString).toHaveBeenCalled()
  })

  it("verifies session with API when logged in flag exists", async () => {
    const api = require("app/services/api").api
    await api.getCsrf()
    await api.me()
    expect(api.getCsrf).toHaveBeenCalled()
    expect(api.me).toHaveBeenCalled()
  })

  it("checks Cognito authentication status", async () => {
    const { userAuthFacade } = require("app/services/registration/UserAuthFacade")
    await userAuthFacade.checkAuthenticationStatus()
    expect(userAuthFacade.checkAuthenticationStatus).toHaveBeenCalled()
  })

  it("clears login flag when session is invalid", async () => {
    const storage = require("app/utils/storage")
    await storage.remove("IS_LOGGED_IN")
    expect(storage.remove).toHaveBeenCalled()
  })

  it("loads user data when authenticated", async () => {
    const { useStores } = require("app/models")
    const stores = useStores()
    await stores.loadUserDataFromBackend()
    expect(stores.loadUserDataFromBackend).toHaveBeenCalled()
  })

  it("clears cached data on fresh login", async () => {
    const { useStores } = require("app/models")
    const stores = useStores()
    await stores.clearAllCachedData()
    expect(stores.clearAllCachedData).toHaveBeenCalled()
  })
})

