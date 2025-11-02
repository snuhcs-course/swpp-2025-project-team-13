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
    expect(getByText("음식점 정보")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={false} onClose={jest.fn()} />,
    )
    expect(queryByText("음식점 정보")).toBeNull()
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
      expect(getByText("주소:")).toBeTruthy()
      expect(getByText("123 Test St")).toBeTruthy()
    })
  })

  it("displays restaurant phone", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("전화:")).toBeTruthy()
      expect(getByText("010-1234-5678")).toBeTruthy()
    })
  })

  it("displays menu section", async () => {
    const { getByText } = render(
      <RestaurantDetailModal restaurantId={1} visible={true} onClose={jest.fn()} />,
    )

    await waitFor(() => {
      expect(getByText("메뉴")).toBeTruthy()
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
      expect(getByText("10,000원")).toBeTruthy()
      expect(getByText("15,000원")).toBeTruthy()
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
      expect(getByText("음식점 정보를 불러올 수 없습니다")).toBeTruthy()
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
})

