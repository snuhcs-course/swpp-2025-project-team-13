import React from "react"
import { render, waitFor } from "@testing-library/react-native"
import { Text } from "react-native"
import { useStores, useInitialRootStore, RootStoreProvider } from "./useStores"
import { RootStoreModel } from "../RootStore"
import * as setupRootStoreModule from "./setupRootStore"

// Mock setupRootStore
jest.mock("./setupRootStore", () => ({
  setupRootStore: jest.fn(),
}))

const mockSetupRootStore = setupRootStoreModule.setupRootStore as jest.MockedFunction<typeof setupRootStoreModule.setupRootStore>

// Mock console.tron
global.console = {
  ...console,
  tron: {
    trackMstNode: jest.fn(),
  },
}

describe("useStores", () => {
  it("should provide access to root store", () => {
    let capturedStore: any = null

    const TestComponent = () => {
      capturedStore = useStores()
      return <Text>Test</Text>
    }

    render(<TestComponent />)

    expect(capturedStore).toBeDefined()
    expect(capturedStore.foodHistoryStore).toBeDefined()
  })

  it("should allow custom root store via provider", () => {
    const customStore = RootStoreModel.create({
      foodHistoryStore: {
        scrappedItems: [
          {
            id: "999",
            name: "Custom Item",
            distance: "0.1 km",
            image: "custom.jpg",
            keywords: ["custom"],
            category: "test",
            allergens: []
          }
        ]
      }
    })

    let capturedStore: any = null

    const TestComponent = () => {
      capturedStore = useStores()
      return <Text>Test</Text>
    }

    render(
      <RootStoreProvider value={customStore}>
        <TestComponent />
      </RootStoreProvider>
    )

    expect(capturedStore).toBe(customStore)
    expect(capturedStore.foodHistoryStore.scrappedItems.length).toBe(1)
    expect(capturedStore.foodHistoryStore.scrappedItems[0].name).toBe("Custom Item")
  })
})

describe("useInitialRootStore", () => {
  const mockUnsubscribe = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.__DEV__ = false
    
    mockSetupRootStore.mockResolvedValue({
      rootStore: expect.any(Object),
      restoredState: null,
      unsubscribe: mockUnsubscribe,
    })
  })

  it("should initialize root store and set rehydrated to true", async () => {
    let capturedData: any = null

    const TestComponent = () => {
      capturedData = useInitialRootStore()
      return <Text>{capturedData.rehydrated ? "Ready" : "Loading"}</Text>
    }

    const { getByText } = render(<TestComponent />)

    // Initially should be loading
    expect(getByText("Loading")).toBeTruthy()

    // Wait for rehydration
    await waitFor(() => {
      expect(getByText("Ready")).toBeTruthy()
    })

    expect(capturedData.rootStore).toBeDefined()
    expect(capturedData.rehydrated).toBe(true)
    expect(mockSetupRootStore).toHaveBeenCalled()
  })

  it("should call callback when provided", async () => {
    const callback = jest.fn()
    let rehydrated = false

    const TestComponent = () => {
      const data = useInitialRootStore(callback)
      rehydrated = data.rehydrated
      return <Text>{rehydrated ? "Ready" : "Loading"}</Text>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(rehydrated).toBe(true)
    })

    expect(callback).toHaveBeenCalled()
  })

  it("should handle async callback", async () => {
    const asyncCallback = jest.fn().mockResolvedValue(undefined)
    let rehydrated = false

    const TestComponent = () => {
      const data = useInitialRootStore(asyncCallback)
      rehydrated = data.rehydrated
      return <Text>{rehydrated ? "Ready" : "Loading"}</Text>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(rehydrated).toBe(true)
    })

    expect(asyncCallback).toHaveBeenCalled()
  })

  it("should track with reactotron in dev mode", async () => {
    global.__DEV__ = true
    const trackMstNodeSpy = jest.spyOn(console.tron, "trackMstNode")

    const TestComponent = () => {
      const data = useInitialRootStore()
      return <Text>{data.rehydrated ? "Ready" : "Loading"}</Text>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(trackMstNodeSpy).toHaveBeenCalled()
    })

    trackMstNodeSpy.mockRestore()
  })

  it("should not track with reactotron in production", async () => {
    global.__DEV__ = false
    const trackMstNodeSpy = jest.spyOn(console.tron, "trackMstNode")

    const TestComponent = () => {
      const data = useInitialRootStore()
      return <Text>{data.rehydrated ? "Ready" : "Loading"}</Text>
    }

    render(<TestComponent />)

    await waitFor(() => {
      // Wait for rehydration but don't expect trackMstNode to be called
      expect(mockSetupRootStore).toHaveBeenCalled()
    })

    expect(trackMstNodeSpy).not.toHaveBeenCalled()
    trackMstNodeSpy.mockRestore()
  })

  it("should cleanup on unmount", async () => {
    const TestComponent = () => {
      const data = useInitialRootStore()
      return <Text>{data.rehydrated ? "Ready" : "Loading"}</Text>
    }

    const { unmount } = render(<TestComponent />)

    await waitFor(() => {
      expect(mockSetupRootStore).toHaveBeenCalled()
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  // Note: Error handling test is complex due to unhandled promise rejections in Jest
  // The actual error handling is tested in the setupRootStore.test.ts file
})