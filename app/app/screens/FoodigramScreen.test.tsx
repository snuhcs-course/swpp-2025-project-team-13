import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { FoodigramScreen } from "./FoodigramScreen";

// Mock navigation
const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate };

// Mock stores with menuScrapStore
jest.mock("../models", () => ({
  useStores: () => ({
    foodHistoryStore: {
      scrappedItems: [],
      scrappedItemsList: [],
      toggleScrappedItem: jest.fn(),
      isScrapped: jest.fn(() => false),
    },
    menuScrapStore: {
      scrappedMenus: [],
      scrappedMenusList: [],
      isScrapped: jest.fn(() => false),
      toggleScrappedMenu: jest.fn(),
      addScrappedMenu: jest.fn(),
      removeScrappedMenu: jest.fn(),
    },
  }),
}));

// Mock API - return immediately resolved promise with results
jest.mock("../services/api", () => ({
  api: {
    getScraps: jest.fn(() => Promise.resolve({ ok: true, data: [] })),
    getMenuRecommendations: jest.fn(() =>
      Promise.resolve({
        success: true,
        results: [
          {
            id: 1,
            menu_name: "Test Menu",
            place_name: "Test Place",
            price: 10000,
            category: "Korean",
            location: "Seoul",
            rating: 4.5,
            review_count: 100,
            reason: "Test reason",
            image_urls: ["https://example.com/image.jpg"],
          },
        ],
      })
    ),
  },
}));

// Mock data
jest.mock("../data/mockData", () => ({
  friends: [
    { id: 1, name: "Friend 1", mutualLikes: [1, 2] },
    { id: 2, name: "Friend 2", mutualLikes: [3] },
  ],
  allCategories: ["Korean", "Japanese", "Chinese"],
  allAllergens: ["Peanuts", "Shellfish"],
}));

describe("FoodigramScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the screen", () => {
    const { toJSON } = render(<FoodigramScreen navigation={navigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it("shows loading state initially", () => {
    const { getByText } = render(<FoodigramScreen navigation={navigation} />);
    expect(getByText("Loading recommendations...")).toBeTruthy();
  });

  it("renders bottom navigation tabs", () => {
    const { getByText } = render(<FoodigramScreen navigation={navigation} />);
    expect(getByText("Discover")).toBeTruthy();
    expect(getByText("Profile")).toBeTruthy();
  });

  it("navigates to Profile when Profile tab is pressed", () => {
    const { getByText } = render(<FoodigramScreen navigation={navigation} />);
    fireEvent.press(getByText("Profile"));
    expect(mockNavigate).toHaveBeenCalledWith("Profile");
  });

  it("displays recommended menu after loading", async () => {
    const { findByText } = render(<FoodigramScreen navigation={navigation} />);
    const menuElement = await findByText("Test Menu");
    expect(menuElement).toBeTruthy();
  });

  it("displays place name after loading", async () => {
    const { findByText } = render(<FoodigramScreen navigation={navigation} />);
    const placeElement = await findByText("Test Place");
    expect(placeElement).toBeTruthy();
  });
});
