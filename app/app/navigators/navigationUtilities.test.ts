import {
  getActiveRouteName,
  navigate,
  goBack,
  resetRoot,
  navigationRef,
} from "./navigationUtilities"
import type { NavigationState, PartialState } from "@react-navigation/native"

// Mock navigationRef
jest.mock("@react-navigation/native", () => ({
  createNavigationContainerRef: () => ({
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    resetRoot: jest.fn(),
    getRootState: jest.fn(),
  }),
}))

describe("navigationUtilities", () => {
  describe("getActiveRouteName", () => {
    it("returns route name for simple state", () => {
      const state: PartialState<NavigationState> = {
        index: 0,
        routes: [{ name: "Home", key: "home-1" }],
      }

      const result = getActiveRouteName(state)
      expect(result).toBe("Home")
    })

    it("returns correct route name based on index", () => {
      const state: PartialState<NavigationState> = {
        index: 1,
        routes: [
          { name: "Home", key: "home-1" },
          { name: "Profile", key: "profile-1" },
        ],
      }

      const result = getActiveRouteName(state)
      expect(result).toBe("Profile")
    })

    it("handles nested navigation state", () => {
      const state: PartialState<NavigationState> = {
        index: 0,
        routes: [
          {
            name: "MainStack",
            key: "main-1",
            state: {
              index: 1,
              routes: [
                { name: "Home", key: "home-1" },
                { name: "Settings", key: "settings-1" },
              ],
            },
          },
        ],
      }

      const result = getActiveRouteName(state)
      expect(result).toBe("Settings")
    })

    it("handles deeply nested navigation state", () => {
      const state: PartialState<NavigationState> = {
        index: 0,
        routes: [
          {
            name: "Root",
            key: "root-1",
            state: {
              index: 0,
              routes: [
                {
                  name: "MainStack",
                  key: "main-1",
                  state: {
                    index: 0,
                    routes: [{ name: "DeepScreen", key: "deep-1" }],
                  },
                },
              ],
            },
          },
        ],
      }

      const result = getActiveRouteName(state)
      expect(result).toBe("DeepScreen")
    })

    it("handles undefined index by defaulting to 0", () => {
      const state: PartialState<NavigationState> = {
        routes: [
          { name: "Home", key: "home-1" },
          { name: "Profile", key: "profile-1" },
        ],
      }

      const result = getActiveRouteName(state)
      expect(result).toBe("Home")
    })
  })

  describe("navigate", () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("navigates when navigationRef is ready", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(true)

      navigate("Home", { userId: 123 })

      expect(navigationRef.navigate).toHaveBeenCalledWith("Home", { userId: 123 })
    })

    it("does not navigate when navigationRef is not ready", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(false)

      navigate("Home")

      expect(navigationRef.navigate).not.toHaveBeenCalled()
    })

    it("navigates without params", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(true)

      navigate("Home")

      expect(navigationRef.navigate).toHaveBeenCalledWith("Home", undefined)
    })
  })

  describe("goBack", () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("goes back when ready and can go back", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(true)
      ;(navigationRef.canGoBack as jest.Mock).mockReturnValue(true)

      goBack()

      expect(navigationRef.goBack).toHaveBeenCalled()
    })

    it("does not go back when not ready", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(false)

      goBack()

      expect(navigationRef.goBack).not.toHaveBeenCalled()
    })

    it("does not go back when cannot go back", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(true)
      ;(navigationRef.canGoBack as jest.Mock).mockReturnValue(false)

      goBack()

      expect(navigationRef.goBack).not.toHaveBeenCalled()
    })
  })

  describe("resetRoot", () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("resets root when ready", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(true)

      const newState = {
        index: 0,
        routes: [{ name: "Login" as const, key: "login-1" }],
      }

      resetRoot(newState)

      expect(navigationRef.resetRoot).toHaveBeenCalledWith(newState)
    })

    it("uses default state when no state provided", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(true)

      resetRoot()

      expect(navigationRef.resetRoot).toHaveBeenCalledWith({ index: 0, routes: [] })
    })

    it("does not reset when not ready", () => {
      ;(navigationRef.isReady as jest.Mock).mockReturnValue(false)

      resetRoot()

      expect(navigationRef.resetRoot).not.toHaveBeenCalled()
    })
  })
})

