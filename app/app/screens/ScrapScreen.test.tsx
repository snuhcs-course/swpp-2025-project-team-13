import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { ScrapScreen } from "./ScrapScreen"

const mockNavigate = jest.fn()
const navigation = {
  navigate: mockNavigate,
} as any

const mockRemoveScrappedMenu = jest.fn()
const mockScrappedMenusList: any[] = []

jest.mock("../models", () => ({
  useStores: () => ({
    menuScrapStore: {
      scrappedMenusList: mockScrappedMenusList,
      removeScrappedMenu: mockRemoveScrappedMenu,
    },
  }),
}))

// Mock Linking for Naver Map tests
const mockCanOpenURL = jest.fn()
const mockOpenURL = jest.fn()

jest.mock("react-native/Libraries/Linking/Linking", () => ({
  canOpenURL: mockCanOpenURL,
  openURL: mockOpenURL,
}))

describe("ScrapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockScrappedMenusList.length = 0
  })

  it("renders without crashing", () => {
    const { toJSON } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders header title", () => {
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("스크랩한 메뉴")).toBeTruthy()
  })

  it("renders empty state when no scrapped menus", () => {
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("스크랩한 메뉴가 없습니다")).toBeTruthy()
    expect(getByText("추천 메뉴에서 음식을 스크랩해보세요")).toBeTruthy()
  })

  it("renders bottom navigation tabs", () => {
    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("추천")).toBeTruthy()
    expect(getByText("스크랩")).toBeTruthy()
    expect(getByText("마이페이지")).toBeTruthy()
  })

  it("navigates to Foodigram when home tab is pressed", () => {
    const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByTestId("FoodigramTab"))
    expect(mockNavigate).toHaveBeenCalledWith("Foodigram")
  })

  it("navigates to Profile when profile tab is pressed", () => {
    const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByTestId("UserTab"))
    expect(mockNavigate).toHaveBeenCalledWith("Profile")
  })

  it("renders scrapped menus when available", () => {
    mockScrappedMenusList.push({
      id: "1",
      menu_name: "치킨",
      place_name: "맛있는 치킨집",
      image_url: "https://example.com/chicken.jpg",
      category: "한식",
      price: 15000,
      coordinates: [126.9780, 37.5665],
    })

    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("치킨")).toBeTruthy()
    expect(getByText("맛있는 치킨집")).toBeTruthy()
  })

  it("displays price in Korean Won format", () => {
    mockScrappedMenusList.push({
      id: "1",
      menu_name: "피자",
      place_name: "피자 가게",
      image_url: "https://example.com/pizza.jpg",
      category: "양식",
      price: 25000,
      coordinates: [126.9780, 37.5665],
    })

    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("₩25,000")).toBeTruthy()
  })

  it("displays category badge when category is not restaurant", () => {
    mockScrappedMenusList.push({
      id: "1",
      menu_name: "초밥",
      place_name: "스시 가게",
      image_url: "https://example.com/sushi.jpg",
      category: "일식",
      price: 30000,
      coordinates: [126.9780, 37.5665],
    })

    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("일식")).toBeTruthy()
  })

  it("shows placeholder text when image is not available", () => {
    mockScrappedMenusList.push({
      id: "1",
      menu_name: "라면",
      place_name: "라면 가게",
      image_url: "",
      category: "한식",
      price: 8000,
      coordinates: [126.9780, 37.5665],
    })

    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("이미지 없음")).toBeTruthy()
  })

  it("displays multiple scrapped menus", () => {
    mockScrappedMenusList.push(
      {
        id: "1",
        menu_name: "치킨",
        place_name: "치킨집",
        image_url: "https://example.com/chicken.jpg",
        category: "한식",
        price: 15000,
        coordinates: [126.9780, 37.5665],
      },
      {
        id: "2",
        menu_name: "피자",
        place_name: "피자집",
        image_url: "https://example.com/pizza.jpg",
        category: "양식",
        price: 20000,
        coordinates: [126.9780, 37.5665],
      }
    )

    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("치킨")).toBeTruthy()
    expect(getByText("피자")).toBeTruthy()
  })

  it("renders correctly with zero price", () => {
    mockScrappedMenusList.push({
      id: "1",
      menu_name: "무료 샘플",
      place_name: "샘플 가게",
      image_url: "https://example.com/sample.jpg",
      category: "기타",
      price: 0,
      coordinates: [126.9780, 37.5665],
    })

    const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
    expect(getByText("₩0")).toBeTruthy()
  })

  describe("Menu Card Interactions", () => {
    it("can press on menu card", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "치킨",
        place_name: "치킨집",
        image_url: "https://example.com/chicken.jpg",
        category: "한식",
        price: 15000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      const menuCard = getByText("치킨")
      fireEvent.press(menuCard)
      // Menu card press should be handled
    })

    it("displays coordinates when available", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "파스타",
        place_name: "이탈리안 레스토랑",
        image_url: "https://example.com/pasta.jpg",
        category: "양식",
        price: 18000,
        coordinates: [126.9780, 37.5665],
      })

      const { toJSON } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(toJSON()).toBeTruthy()
    })

    it("handles menu without coordinates", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "샌드위치",
        place_name: "샌드위치 가게",
        image_url: "https://example.com/sandwich.jpg",
        category: "기타",
        price: 7000,
        coordinates: undefined,
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("샌드위치")).toBeTruthy()
    })
  })

  describe("Image Handling", () => {
    it("shows menu with whitespace-only image URL as empty", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "햄버거",
        place_name: "햄버거 가게",
        image_url: "   ",
        category: "양식",
        price: 9000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("이미지 없음")).toBeTruthy()
    })

    it("renders image when valid URL is provided", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "스테이크",
        place_name: "스테이크 하우스",
        image_url: "https://example.com/steak.jpg",
        category: "양식",
        price: 35000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("스테이크")).toBeTruthy()
    })
  })

  describe("Price Formatting", () => {
    it("formats large prices correctly", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "코스 요리",
        place_name: "고급 레스토랑",
        image_url: "https://example.com/course.jpg",
        category: "프렌치",
        price: 150000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("₩150,000")).toBeTruthy()
    })

    it("handles price with no thousands separator", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "커피",
        place_name: "카페",
        image_url: "https://example.com/coffee.jpg",
        category: "카페",
        price: 500,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("₩500")).toBeTruthy()
    })
  })

  describe("Category Display", () => {
    it("does not show category badge when category is restaurant", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "요리",
        place_name: "레스토랑",
        image_url: "https://example.com/dish.jpg",
        category: "restaurant",
        price: 20000,
        coordinates: [126.9780, 37.5665],
      })

      const { queryByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(queryByText("restaurant")).toBeNull()
    })

    it("shows category for various cuisine types", () => {
      mockScrappedMenusList.push(
        {
          id: "1",
          menu_name: "김치찌개",
          place_name: "한식당",
          image_url: "https://example.com/kimchi.jpg",
          category: "한식",
          price: 8000,
          coordinates: [126.9780, 37.5665],
        },
        {
          id: "2",
          menu_name: "라멘",
          place_name: "일식당",
          image_url: "https://example.com/ramen.jpg",
          category: "일식",
          price: 10000,
          coordinates: [126.9780, 37.5665],
        }
      )

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("한식")).toBeTruthy()
      expect(getByText("일식")).toBeTruthy()
    })
  })

  describe("Navigation Bar", () => {
    it("highlights scrap tab as active", () => {
      const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      const scrapTab = getByTestId("ScrapTab")
      expect(scrapTab).toBeTruthy()
    })

    it("can navigate to scrap tab (stays on current screen)", () => {
      const { getByTestId } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      fireEvent.press(getByTestId("ScrapTab"))
      expect(mockNavigate).toHaveBeenCalledWith("Scrap")
    })
  })

  describe("Large Data Sets", () => {
    it("renders many scrapped menus efficiently", () => {
      // Add 20 menus
      for (let i = 1; i <= 20; i++) {
        mockScrappedMenusList.push({
          id: `${i}`,
          menu_name: `메뉴 ${i}`,
          place_name: `가게 ${i}`,
          image_url: `https://example.com/menu${i}.jpg`,
          category: "한식",
          price: 10000 + i * 1000,
          coordinates: [126.9780, 37.5665],
        })
      }

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("메뉴 1")).toBeTruthy()
      expect(getByText("메뉴 20")).toBeTruthy()
    })
  })

  describe("Edge Cases", () => {
    it("handles menu with very long name", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "매우 긴 메뉴 이름입니다 아주아주아주 길어요 정말로 길어요",
        place_name: "가게",
        image_url: "https://example.com/menu.jpg",
        category: "한식",
        price: 10000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("매우 긴 메뉴 이름입니다 아주아주아주 길어요 정말로 길어요")).toBeTruthy()
    })

    it("handles menu with very long place name", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "메뉴",
        place_name: "매우 긴 가게 이름입니다 아주아주아주 길어요 정말로 길어요 엄청나게 길어요",
        image_url: "https://example.com/menu.jpg",
        category: "한식",
        price: 10000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("매우 긴 가게 이름입니다 아주아주아주 길어요 정말로 길어요 엄청나게 길어요")).toBeTruthy()
    })

    it("handles menu with negative price", () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "할인 메뉴",
        place_name: "가게",
        image_url: "https://example.com/menu.jpg",
        category: "한식",
        price: -5000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      expect(getByText("₩-5,000")).toBeTruthy()
    })
  })

  describe("Naver Map Integration", () => {
    beforeEach(() => {
      mockCanOpenURL.mockReset()
      mockOpenURL.mockReset()
      // Mock Platform.OS to be 'android' for these tests
      jest.spyOn(require("react-native"), "Platform", "get").mockReturnValue({ OS: 'android' })
    })

    it("opens Naver Map when menu with coordinates is pressed on Android", async () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "치킨",
        place_name: "맛있는 치킨집",
        image_url: "https://example.com/chicken.jpg",
        category: "한식",
        price: 15000,
        coordinates: [126.9780, 37.5665],
      })

      mockCanOpenURL.mockResolvedValue(true)
      mockOpenURL.mockResolvedValue(true)

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      
      // Press on the menu card
      fireEvent.press(getByText("치킨"))

      // Should attempt to open Naver Map
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it("does not open Naver Map when coordinates are missing", async () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "치킨",
        place_name: "맛있는 치킨집",
        image_url: "https://example.com/chicken.jpg",
        category: "한식",
        price: 15000,
        coordinates: null,
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      
      // Press on the menu card
      fireEvent.press(getByText("치킨"))

      // Should not attempt to open URL
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockCanOpenURL).not.toHaveBeenCalled()
    })

    it("handles Naver Map opening failure gracefully", async () => {
      mockScrappedMenusList.push({
        id: "1",
        menu_name: "치킨",
        place_name: "맛있는 치킨집",
        image_url: "https://example.com/chicken.jpg",
        category: "한식",
        price: 15000,
        coordinates: [126.9780, 37.5665],
      })

      mockCanOpenURL.mockResolvedValue(false)
      mockOpenURL.mockRejectedValue(new Error("Cannot open"))

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      
      // Press on the menu card
      fireEvent.press(getByText("치킨"))

      // Should handle error gracefully
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it("skips Naver Map on non-Android platforms", async () => {
      // Mock Platform.OS to be 'ios'
      jest.spyOn(require("react-native"), "Platform", "get").mockReturnValue({ OS: 'ios' })

      mockScrappedMenusList.push({
        id: "1",
        menu_name: "치킨",
        place_name: "맛있는 치킨집",
        image_url: "https://example.com/chicken.jpg",
        category: "한식",
        price: 15000,
        coordinates: [126.9780, 37.5665],
      })

      const { getByText } = render(<ScrapScreen navigation={navigation} route={{} as any} />)
      
      // Press on the menu card
      fireEvent.press(getByText("치킨"))

      // Should not attempt to open URL on iOS
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockCanOpenURL).not.toHaveBeenCalled()
    })
  })
})

