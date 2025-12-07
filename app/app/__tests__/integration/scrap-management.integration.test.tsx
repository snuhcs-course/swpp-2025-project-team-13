/**
 * Scrap Management Integration Test
 * Tests the scrap/bookmark management feature.
 */

import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { ScrapScreen } from "../../screens/ScrapScreen"

const mockNavigate = jest.fn()
const navigation = { navigate: mockNavigate } as any

const mockRemoveScrappedMenu = jest.fn()
let mockScrappedMenusList: any[] = []

jest.mock("app/models", () => ({
  useStores: () => ({
    menuScrapStore: {
      get scrappedMenusList() { return mockScrappedMenusList },
      removeScrappedMenu: mockRemoveScrappedMenu,
    },
  }),
}))

jest.mock("react-native/Libraries/Linking/Linking", () => ({
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(true),
}))

describe("Scrap Management Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockScrappedMenusList = []
  })

  it("renders scrap screen", () => {
    const { toJSON } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(toJSON()).toBeTruthy()
  })

  it("shows header title", () => {
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("스크랩한 메뉴")).toBeTruthy()
  })

  it("shows empty state when no scraps", () => {
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("스크랩한 메뉴가 없습니다")).toBeTruthy()
    expect(getByText("추천 메뉴에서 음식을 스크랩해보세요")).toBeTruthy()
  })

  it("shows bottom navigation tabs", () => {
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("추천")).toBeTruthy()
    expect(getByText("스크랩")).toBeTruthy()
    expect(getByText("마이페이지")).toBeTruthy()
  })

  it("navigates to Foodigram when tab pressed", () => {
    const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByTestId("FoodigramTab"))
    expect(mockNavigate).toHaveBeenCalledWith("Foodigram")
  })

  it("navigates to Profile when tab pressed", () => {
    const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByTestId("UserTab"))
    expect(mockNavigate).toHaveBeenCalledWith("Profile")
  })

  it("displays scrapped menu when available", () => {
    mockScrappedMenusList = [{
      id: "1",
      menu_name: "김치찌개",
      place_name: "맛있는 식당",
      image_url: "https://example.com/img.jpg",
      category: "한식",
      price: 8000,
      coordinates: [126.9780, 37.5665],
    }]
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("김치찌개")).toBeTruthy()
    expect(getByText("맛있는 식당")).toBeTruthy()
  })

  it("displays price correctly", () => {
    mockScrappedMenusList = [{
      id: "1",
      menu_name: "라멘",
      place_name: "라멘집",
      image_url: "",
      category: "일식",
      price: 12000,
      coordinates: [126.9780, 37.5665],
    }]
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("₩12,000")).toBeTruthy()
  })

  it("displays multiple scrapped items", () => {
    mockScrappedMenusList = [
      {
        id: "1",
        menu_name: "김치찌개",
        place_name: "식당1",
        image_url: "",
        category: "한식",
        price: 8000,
        coordinates: [126.9780, 37.5665],
      },
      {
        id: "2",
        menu_name: "라멘",
        place_name: "식당2",
        image_url: "",
        category: "일식",
        price: 12000,
        coordinates: [126.9780, 37.5665],
      },
    ]
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("김치찌개")).toBeTruthy()
    expect(getByText("라멘")).toBeTruthy()
  })

  it("shows placeholder for missing image", () => {
    mockScrappedMenusList = [{
      id: "1",
      menu_name: "테스트메뉴",
      place_name: "테스트식당",
      image_url: "",
      category: "한식",
      price: 10000,
      coordinates: [126.9780, 37.5665],
    }]
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("이미지 없음")).toBeTruthy()
  })
})

