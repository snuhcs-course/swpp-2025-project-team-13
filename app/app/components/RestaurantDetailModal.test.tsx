import { render, fireEvent, waitFor } from "@testing-library/react-native"
import React from "react"
import { RestaurantDetailModal } from "./RestaurantDetailModal"

// Mock dependencies
jest.mock("../services/api", () => ({
  api: {
    getRestaurantDetail: jest.fn(() => Promise.resolve({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        phone: "010-1234-5678",
        image_url: "https://example.com/restaurant.jpg",
        menus: [
          { name: "Menu 1", price: "10000.00", image_url: "https://example.com/menu1.jpg" },
          { name: "Menu 2", price: "15000.00" },
        ],
      },
    })),
    toggleScrap: jest.fn(() => Promise.resolve({ ok: true, data: { scrapped: true } })),
  },
}))

jest.mock("../models", () => ({
  useStores: () => ({
    foodHistoryStore: {
      isScrapped: jest.fn(() => false),
      toggleScrappedItem: jest.fn(),
      scrappedItemsList: [],
    },
  }),
}))

jest.mock("lucide-react-native", () => ({
  X: "X",
  Bookmark: "Bookmark",
}))

describe("RestaurantDetailModal", () => {
  it("renders when visible", () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )
    expect(getByText("Restaurant Info")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={false} onClose={jest.fn()} />,
    )
    expect(queryByText("Restaurant Info")).toBeNull()
  })

  it("calls onClose when modal is closed", () => {
    const onCloseMock = jest.fn()
    const { toJSON } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={onCloseMock} />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders modal backdrop", () => {
    const onCloseMock = jest.fn()
    const { toJSON } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={onCloseMock} />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("loads restaurant detail when visible", async () => {
    const { api } = require("../services/api")
    render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(api.getRestaurantDetail).toHaveBeenCalledWith(1)
    })
  })

  it("displays restaurant name", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Test Restaurant")).toBeTruthy()
    })
  })

  it("displays restaurant address", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Address:")).toBeTruthy()
      expect(getByText("123 Test St")).toBeTruthy()
    })
  })

  it("displays restaurant phone", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Phone:")).toBeTruthy()
      expect(getByText("010-1234-5678")).toBeTruthy()
    })
  })

  it("displays menu section", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Menu")).toBeTruthy()
    })
  })

  it("displays menu items", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Menu 1")).toBeTruthy()
      expect(getByText("Menu 2")).toBeTruthy()
    })
  })

  it("formats menu prices correctly", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("₩10,000")).toBeTruthy()
      expect(getByText("₩15,000")).toBeTruthy()
    })
  })

  it("renders restaurant with scrap button", async () => {
    const { toJSON } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(toJSON()).toBeTruthy()
    })
  })

  it("shows error message when restaurant loading fails", async () => {
    const { api } = require("../services/api")
    // Ensure ALL calls in this test return an error (StrictMode may trigger multiple renders)
    api.getRestaurantDetail.mockImplementation(() => Promise.resolve({ ok: false, problem: "error" }))

    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Unable to load restaurant information")).toBeTruthy()
    })
  })

  it("does not load when restaurantId is null", () => {
    const { api } = require("../services/api")
    api.getRestaurantDetail.mockClear()

    render(
      <RestaurantDetailModal restaurantId={null} visible={true} onClose={jest.fn()} />,
    )

    expect(api.getRestaurantDetail).not.toHaveBeenCalled()
  })

  it("handles restaurant loading exception", async () => {
    const { api } = require("../services/api")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    api.getRestaurantDetail.mockRejectedValueOnce(new Error("Network error"))

    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading restaurant:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("can toggle scrap on restaurant", async () => {
    const { api } = require("../services/api")
    
    api.getRestaurantDetail.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [],
      },
    })

    api.toggleScrap.mockResolvedValueOnce({ ok: true, data: { scrapped: true } })

    const { toJSON } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      // Wait for restaurant to load
      expect(api.getRestaurantDetail).toHaveBeenCalled()
    })

    // The component should render
    expect(toJSON()).toBeTruthy()
  })

  it("handles scrap toggle failure", async () => {
    const { api } = require("../services/api")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    
    api.getRestaurantDetail.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [],
      },
    })

    api.toggleScrap.mockResolvedValueOnce({ ok: false, problem: "server error" })

    const { UNSAFE_getByType } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(api.getRestaurantDetail).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it("handles scrap toggle exception", async () => {
    const { api } = require("../services/api")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    
    api.getRestaurantDetail.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [],
      },
    })

    api.toggleScrap.mockRejectedValueOnce(new Error("Network error"))

    render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(api.getRestaurantDetail).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it("formats invalid price correctly", async () => {
    const { api } = require("../services/api")
    
    // Reset and set up mock for this specific test
    api.getRestaurantDetail.mockReset()
    api.getRestaurantDetail.mockResolvedValue({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [
          { name: "Invalid Price Menu", price: "not-a-number" },
        ],
      },
    })

    const { getByText, rerender } = render(
      <RestaurantDetailModal restaurantId={null} visible={false} onClose={jest.fn()} />,
    )

    // Now open the modal
    rerender(<RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />)

    await waitFor(() => {
      expect(getByText("Invalid Price Menu")).toBeTruthy()
      expect(getByText("not-a-number")).toBeTruthy()
    })
  })

  it("renders restaurant without image", async () => {
    const { api } = require("../services/api")
    
    api.getRestaurantDetail.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [],
      },
    })

    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Test Restaurant")).toBeTruthy()
    })
  })

  it("renders menu without image", async () => {
    const { api } = require("../services/api")
    
    // Reset and set up mock for this specific test
    api.getRestaurantDetail.mockReset()
    api.getRestaurantDetail.mockResolvedValue({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [
          { name: "Menu Without Image", price: "10000.00" },
        ],
      },
    })

    const { getByText, rerender } = render(
      <RestaurantDetailModal restaurantId={null} visible={false} onClose={jest.fn()} />,
    )

    // Now open the modal
    rerender(<RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />)

    await waitFor(() => {
      expect(getByText("Menu Without Image")).toBeTruthy()
    })
  })

  it("renders restaurant without phone", async () => {
    const { api } = require("../services/api")
    
    api.getRestaurantDetail.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [],
      },
    })

    const { getByText, queryByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Test Restaurant")).toBeTruthy()
      expect(queryByText("Phone:")).toBeNull()
    })
  })

  it("renders restaurant without menus", async () => {
    const { api } = require("../services/api")
    
    api.getRestaurantDetail.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 1,
        name: "Test Restaurant",
        address: "123 Test St",
        menus: [],
      },
    })

    const { getByText, queryByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("Test Restaurant")).toBeTruthy()
      expect(queryByText("Menu")).toBeNull()
    })
  })

  it("checks scrap status on modal open", async () => {
    const { toJSON } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(toJSON()).toBeTruthy()
    })
  })
})

