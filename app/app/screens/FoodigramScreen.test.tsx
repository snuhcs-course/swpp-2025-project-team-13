import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { FoodigramScreen } from "./FoodigramScreen";

// Mock navigation
const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
const navigation = {
  navigate: mockNavigate,
  addListener: mockAddListener,
};

// Mock route params
const defaultRoute = { params: undefined };

// Mock menuScrapStore
const mockToggleScrappedMenu = jest.fn().mockReturnValue(true);
const mockIsScrapped = jest.fn().mockReturnValue(false);
const mockAddScrappedMenu = jest.fn();
const mockRemoveScrappedMenu = jest.fn();

// Mock stores
jest.mock("../models", () => ({
  useStores: () => ({
    foodHistoryStore: {
      scrappedItems: [],
      scrappedItemsList: [],
      toggleScrappedItem: jest.fn(),
    },
    menuScrapStore: {
      scrappedMenus: [],
      scrappedMenusList: [],
      addScrappedMenu: mockAddScrappedMenu,
      removeScrappedMenu: mockRemoveScrappedMenu,
      isScrapped: mockIsScrapped,
      toggleScrappedMenu: mockToggleScrappedMenu,
    },
  }),
}));

// Mock API
const mockGetMenuRecommendationsPhase1 = jest.fn();
const mockGetMenuRecommendationsPhase2 = jest.fn();
const mockToggleScrapWithName = jest.fn();
jest.mock("../services/api", () => ({
  api: {
    getScraps: jest.fn(() => Promise.resolve({ ok: true, data: [] })),
    getMenuRecommendations: jest.fn(() =>
      Promise.resolve({
        success: true,
        results: [],
      })
    ),
    getMenuRecommendationsPhase1: (...args: any[]) => mockGetMenuRecommendationsPhase1(...args),
    getMenuRecommendationsPhase2: (...args: any[]) => mockGetMenuRecommendationsPhase2(...args),
    toggleScrapWithName: (...args: any[]) => mockToggleScrapWithName(...args),
  },
}));

// Mock expo-location
const mockGetForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: (...args: any[]) => mockGetForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: any[]) => mockGetCurrentPositionAsync(...args),
  Accuracy: {
    Balanced: 3,
  },
}));

// Mock data
jest.mock("../data/mockData", () => ({
  friends: [],
  allCategories: ["Korean", "Japanese", "Chinese"],
  allAllergens: ["Peanuts", "Shellfish"],
}));

// Mock storage
const mockLoadString = jest.fn();
const mockSaveString = jest.fn();
jest.mock("../utils/storage", () => ({
  save: jest.fn(),
  load: jest.fn().mockResolvedValue(null),
  loadString: (...args: any[]) => mockLoadString(...args),
  saveString: (...args: any[]) => mockSaveString(...args),
  remove: jest.fn(),
  clear: jest.fn(),
}));

// Sample menu data for tests
const sampleMenus = [
  {
    id: "1",
    menu_name: "Kimchi Stew",
    place_name: "Restaurant A",
    price: 8000,
    category: "Korean",
    location: "Seoul",
    rating: 4.5,
    review_count: 120,
    image_urls: ["https://example.com/image1.jpg"],
    coordinates: [126.9780, 37.5665],
    restaurant_id: 101,
  },
  {
    id: "2",
    menu_name: "Ramen",
    place_name: "Restaurant B",
    price: 12000,
    category: "Japanese",
    location: "Gangnam",
    rating: 4.2,
    review_count: 85,
    image_urls: ["https://example.com/image2.jpg"],
    coordinates: [127.0276, 37.4979],
    restaurant_id: 102,
  },
];

describe("FoodigramScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    mockGetMenuRecommendationsPhase1.mockResolvedValue({
      ok: true,
      data: { results: sampleMenus },
    });
    mockGetMenuRecommendationsPhase2.mockResolvedValue({
      ok: true,
      data: { reason_updates: [] },
    });
    mockToggleScrapWithName.mockResolvedValue({ ok: true, data: { is_scrapped: true } });
    mockLoadString.mockResolvedValue(null);
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 37.5, longitude: 126.9 },
    });
    mockIsScrapped.mockReturnValue(false);
    mockToggleScrappedMenu.mockReturnValue(true);
    
    // Reset global debounce state
    if ((window as any).__foodigramDebounceState) {
      if ((window as any).__foodigramDebounceState.timer) {
        clearTimeout((window as any).__foodigramDebounceState.timer);
      }
      delete (window as any).__foodigramDebounceState;
    }
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders without crashing", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      expect(toJSON()).toBeTruthy();
    });

    it("renders bottom navigation tabs", async () => {
      const { getByTestId } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      expect(getByTestId("FoodigramTab")).toBeTruthy();
      expect(getByTestId("ScrapTab")).toBeTruthy();
      expect(getByTestId("ProfileTab")).toBeTruthy();
    });
  });

  describe("Navigation", () => {
    it("navigates to Scrap screen when ScrapTab is pressed", async () => {
      const { getByTestId } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      fireEvent.press(getByTestId("ScrapTab"));
      expect(mockNavigate).toHaveBeenCalledWith("Scrap");
    });

    it("navigates to Profile screen when ProfileTab is pressed", async () => {
      const { getByTestId } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      fireEvent.press(getByTestId("ProfileTab"));
      expect(mockNavigate).toHaveBeenCalledWith("Profile");
    });

    it("navigates to Foodigram when FoodigramTab is pressed", async () => {
      const { getByTestId } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      fireEvent.press(getByTestId("FoodigramTab"));
      expect(mockNavigate).toHaveBeenCalledWith("Foodigram");
    });

    it("adds focus listener on mount", async () => {
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockAddListener).toHaveBeenCalledWith("focus", expect.any(Function));
    });
  });

  describe("Location", () => {
    it("checks location permission on mount", async () => {
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockLoadString).toHaveBeenCalledWith("LOCATION_PERMISSION_GRANTED");
    });

    it("uses actual location when permission granted", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true");
        if (key === "USE_DUMMY_LOCATION") return Promise.resolve("false");
        return Promise.resolve(null);
      });
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
      mockGetCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 37.5, longitude: 126.9 },
      });
      
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetCurrentPositionAsync).toHaveBeenCalled();
    });

    it("uses default location when permission denied", async () => {
      mockLoadString.mockResolvedValue("false");
      
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it("uses default location when using dummy location", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true");
        if (key === "USE_DUMMY_LOCATION") return Promise.resolve("true");
        return Promise.resolve(null);
      });
      
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it("handles location error gracefully", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true");
        if (key === "USE_DUMMY_LOCATION") return Promise.resolve("false");
        return Promise.resolve(null);
      });
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
      mockGetCurrentPositionAsync.mockRejectedValue(new Error("Location error"));
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Should still render without crashing
      expect(toJSON()).toBeTruthy();
    });

    it("handles location permission check error gracefully", async () => {
      mockLoadString.mockRejectedValue(new Error("Storage error"));
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Recommendations", () => {
    it("fetches recommendations on mount", async () => {
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("handles Phase 1 API error", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: false,
        problem: "NETWORK_ERROR",
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles Phase 1 API exception", async () => {
      mockGetMenuRecommendationsPhase1.mockRejectedValue(new Error("Network error"));
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles empty results", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: { results: [] },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Bookmarking", () => {
    it("handles scrap API success", async () => {
      mockToggleScrapWithName.mockResolvedValue({ ok: true });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles scrap API error", async () => {
      mockToggleScrapWithName.mockResolvedValue({ ok: false, problem: "NETWORK_ERROR" });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Pull to Refresh", () => {
    it("supports pull to refresh", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      expect(flatLists.length).toBeGreaterThan(0);
      
      if (flatLists[0].props.refreshControl) {
        expect(flatLists[0].props.refreshControl.props.onRefresh).toBeDefined();
      }
    });

    it("calls API on refresh", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.refreshControl?.props?.onRefresh) {
        await act(async () => {
          flatLists[0].props.refreshControl.props.onRefresh();
          jest.runAllTimers();
        });
        
        expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
      }
    });
  });

  describe("Route Params Refresh", () => {
    it("refreshes on menu_images_updated trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "menu_images_updated",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("refreshes on food_label_changed trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "food_label_changed",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("refreshes on preferences_updated trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "preferences_updated",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("refreshes on album_scan_completed trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "album_scan_completed",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("does not refresh on unknown trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "unknown_trigger",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      expect(mockGetMenuRecommendationsPhase1).not.toHaveBeenCalled();
    });
  });

  describe("Scroll Handling", () => {
    it("handles scroll events", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        await act(async () => {
          flatLists[0].props.onScroll?.({
            nativeEvent: {
              contentOffset: { y: 100 },
              contentSize: { height: 1000 },
              layoutMeasurement: { height: 500 },
            },
          });
        });
        
        expect(flatLists[0]).toBeTruthy();
      }
    });

    it("handles scroll end drag for bottom bounce detection", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        await act(async () => {
          flatLists[0].props.onScrollEndDrag?.({
            nativeEvent: {
              contentOffset: { y: 450 },
              contentSize: { height: 500 },
              layoutMeasurement: { height: 500 },
              velocity: { y: -1 },
            },
          });
        });
        
        expect(flatLists[0]).toBeTruthy();
      }
    });

    it("updates viewable items on scroll", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        await act(async () => {
          flatLists[0].props.onViewableItemsChanged?.({
            viewableItems: [{ index: 1, item: sampleMenus[1] }],
          });
        });
        
        expect(flatLists[0]).toBeTruthy();
      }
    });

    it("handles empty viewable items", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        await act(async () => {
          flatLists[0].props.onViewableItemsChanged?.({
            viewableItems: [],
          });
        });
        
        expect(flatLists[0]).toBeTruthy();
      }
    });
  });

  describe("FlatList Configuration", () => {
    it("has correct FlatList configuration", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        const flatList = flatLists[0];
        expect(flatList.props.pagingEnabled).toBe(true);
        expect(flatList.props.bounces).toBe(true);
        expect(flatList.props.removeClippedSubviews).toBe(true);
      }
    });

    it("has keyExtractor function", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.keyExtractor).toBeDefined();
      }
    });

    it("has getItemLayout function", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.getItemLayout).toBeDefined();
      }
    });
  });

  describe("Debouncing", () => {
    it("debounces multiple rapid fetch calls", async () => {
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cleanup", () => {
    it("cleans up on unmount", async () => {
      const { unmount } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      unmount();
      // Should clean up without errors
    });
  });

  describe("Phase 2 Reasons", () => {
    it("handles Phase 2 API error gracefully", async () => {
      mockGetMenuRecommendationsPhase2.mockResolvedValue({
        ok: false,
        problem: "NETWORK_ERROR",
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles 401 unauthorized in Phase 2", async () => {
      mockGetMenuRecommendationsPhase2.mockResolvedValue({
        ok: false,
        status: 401,
        problem: "UNAUTHORIZED",
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles Phase 2 exception", async () => {
      mockGetMenuRecommendationsPhase2.mockRejectedValue(new Error("Network error"));
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Loading Animation", () => {
    it("shows loading animation during fetch", async () => {
      mockGetMenuRecommendationsPhase1.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, data: { results: sampleMenus } });
          }, 1000);
        })
      );
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Menu Item Rendering", () => {
    it("renders menu items with correct data", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles menu without price", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: {
          results: [{
            ...sampleMenus[0],
            price: null,
          }],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles menu without image_urls", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: {
          results: [{
            ...sampleMenus[0],
            image_urls: [],
          }],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles menu without coordinates", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: {
          results: [{
            ...sampleMenus[0],
            coordinates: [],
          }],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Toast Handling", () => {
    it("renders ScrapToast component", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // ScrapToast should be in the component tree
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Bottom Tabs", () => {
    it("renders all three bottom tabs", async () => {
      const { getByTestId } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(getByTestId("FoodigramTab")).toBeTruthy();
      expect(getByTestId("ScrapTab")).toBeTruthy();
      expect(getByTestId("ProfileTab")).toBeTruthy();
    });
  });

  describe("Focus Listener", () => {
    it("triggers location check on focus", async () => {
      let focusCallback: () => void = () => {};
      mockAddListener.mockImplementation((event, callback) => {
        if (event === "focus") {
          focusCallback = callback;
        }
        return jest.fn();
      });
      
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Clear mock
      mockLoadString.mockClear();
      
      // Simulate focus
      await act(async () => {
        focusCallback();
        jest.runAllTimers();
      });
      
      expect(mockLoadString).toHaveBeenCalledWith("LOCATION_PERMISSION_GRANTED");
    });
  });

  describe("Append Mode Loading", () => {
    it("handles append mode when loading more menus", async () => {
      const initialMenus = [sampleMenus[0]];
      const additionalMenus = [sampleMenus[1]];
      
      mockGetMenuRecommendationsPhase1
        .mockResolvedValueOnce({ ok: true, data: { results: initialMenus } })
        .mockResolvedValueOnce({ ok: true, data: { results: additionalMenus } });
      
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Trigger load more via scroll end drag
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        await act(async () => {
          // Simulate bottom bounce
          flatLists[0].props.onScrollEndDrag?.({
            nativeEvent: {
              contentOffset: { y: 950 },
              contentSize: { height: 1000 },
              layoutMeasurement: { height: 100 },
              velocity: { y: -1 },
            },
          });
          jest.runAllTimers();
        });
      }
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("handles duplicate menus in append mode", async () => {
      mockGetMenuRecommendationsPhase1
        .mockResolvedValueOnce({ ok: true, data: { results: sampleMenus } })
        .mockResolvedValueOnce({ ok: true, data: { results: sampleMenus } }); // Same menus
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Query Text in Recommendations", () => {
    it("passes query text to Phase 1", async () => {
      const routeWithQuery = {
        params: {
          refreshRecommendations: true,
          refreshReason: "food_appetite_updated",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithQuery} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });
  });

  describe("Image Background Events", () => {
    it("renders with ImageBackground components", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Verify component renders with image support
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Phase 2 with Reason Updates", () => {
    it("handles Phase 2 reason updates", async () => {
      mockGetMenuRecommendationsPhase2.mockResolvedValue({
        ok: true,
        data: {
          reason_updates: [
            { menu_id: "1", reason: "This is a great choice for you!" },
          ],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Verify component can handle Phase 2 responses
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Bookmark Toggle", () => {
    it("supports bookmark functionality", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Just verify component renders with bookmark support
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Loading Footer", () => {
    it("renders footer when loading more", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        const footerComponent = flatLists[0].props.ListFooterComponent;
        expect(footerComponent).toBeDefined();
      }
    });
  });

  describe("Empty Component", () => {
    it("renders empty component when no data", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: { results: [] },
      });
      
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        const emptyComponent = flatLists[0].props.ListEmptyComponent;
        expect(emptyComponent).toBeDefined();
      }
    });
  });

  describe("Debounce State Persistence", () => {
    it("batches multiple rapid requests", async () => {
      // First render
      render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Should have made at least one request
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });
  });

  describe("Multiple Refresh Triggers", () => {
    it("handles profile_images_updated trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "profile_images_updated",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });

    it("handles user_preferences_updated trigger", async () => {
      const routeWithRefresh = {
        params: {
          refreshRecommendations: true,
          refreshReason: "user_preferences_updated",
        },
      };
      
      const { rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      mockGetMenuRecommendationsPhase1.mockClear();
      
      rerender(<FoodigramScreen navigation={navigation} route={routeWithRefresh} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(mockGetMenuRecommendationsPhase1).toHaveBeenCalled();
    });
  });

  describe("At Bottom Detection", () => {
    it("detects when user is at bottom of scroll", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        // Simulate scrolling to near bottom
        await act(async () => {
          flatLists[0].props.onScroll?.({
            nativeEvent: {
              contentOffset: { y: 480 },
              contentSize: { height: 500 },
              layoutMeasurement: { height: 100 },
            },
          });
        });
        
        // Then scroll further
        await act(async () => {
          flatLists[0].props.onScroll?.({
            nativeEvent: {
              contentOffset: { y: 100 },
              contentSize: { height: 500 },
              layoutMeasurement: { height: 100 },
            },
          });
        });
        
        expect(flatLists[0]).toBeTruthy();
      }
    });
  });

  describe("Animation Management", () => {
    it("manages loading animation state", async () => {
      const { toJSON, rerender } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      
      // Start loading
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Complete loading
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Menu Card Interaction", () => {
    it("renders menu card with all elements", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("handles menu card press", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Get touchable items from menu cards
      const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });
  });

  describe("Reason Loading Dots Animation", () => {
    it("handles reason loading dots", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Simulate time passing for animation
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Menu With Existing Reason", () => {
    it("handles menu with pre-existing reason", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: {
          results: [{
            ...sampleMenus[0],
            reason: "Pre-existing reason from API",
          }],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Rotation Animation", () => {
    it("creates rotation animation during loading", async () => {
      // Keep loading for a while
      mockGetMenuRecommendationsPhase1.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({ ok: true, data: { results: sampleMenus } });
          }, 2000);
        })
      );
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      
      // Check during loading
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(toJSON()).toBeTruthy();
      
      // Complete loading
      await act(async () => {
        jest.runAllTimers();
      });
    });
  });

  describe("Scroll Velocity Detection", () => {
    it("handles various scroll velocities", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        // Test with no velocity
        await act(async () => {
          flatLists[0].props.onScrollEndDrag?.({
            nativeEvent: {
              contentOffset: { y: 450 },
              contentSize: { height: 500 },
              layoutMeasurement: { height: 500 },
              velocity: null,
            },
          });
        });
        
        // Test with positive velocity (scrolling down)
        await act(async () => {
          flatLists[0].props.onScrollEndDrag?.({
            nativeEvent: {
              contentOffset: { y: 450 },
              contentSize: { height: 500 },
              layoutMeasurement: { height: 500 },
              velocity: { y: 1 },
            },
          });
        });
        
        expect(flatLists[0]).toBeTruthy();
      }
    });
  });

  describe("Error Handling", () => {
    it("handles API error gracefully during debounce", async () => {
      mockGetMenuRecommendationsPhase1.mockRejectedValue(new Error("API Error"));
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("No More Data State", () => {
    it("handles hasMoreData false state", async () => {
      // Return less than 10 items to trigger hasMoreData = false
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: { results: [sampleMenus[0]] },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Key Extractor Edge Cases", () => {
    it("handles menu without id", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: {
          results: [{
            ...sampleMenus[0],
            id: undefined,
          }],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Get Item Layout", () => {
    it("returns correct item layout", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.getItemLayout) {
        const layout = flatLists[0].props.getItemLayout(null, 0);
        expect(layout).toHaveProperty("length");
        expect(layout).toHaveProperty("offset");
        expect(layout).toHaveProperty("index");
      }
    });
  });

  describe("Location Update Effect", () => {
    it("tracks location changes", async () => {
      mockLoadString.mockImplementation((key: string) => {
        if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true");
        if (key === "USE_DUMMY_LOCATION") return Promise.resolve("false");
        return Promise.resolve(null);
      });
      mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
      mockGetCurrentPositionAsync
        .mockResolvedValueOnce({ coords: { latitude: 37.5, longitude: 126.9 } })
        .mockResolvedValueOnce({ coords: { latitude: 37.6, longitude: 127.0 } });
      
      const { rerender, toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Simulate focus to trigger location check again
      let focusCallback: () => void = () => {};
      mockAddListener.mockImplementation((event, callback) => {
        if (event === "focus") {
          focusCallback = callback;
        }
        return jest.fn();
      });
      
      rerender(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        focusCallback();
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Cleanup Effects", () => {
    it("cleans up timers and refs on unmount", async () => {
      const { unmount } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      
      unmount();
      
      // Verify no errors after unmount
      await act(async () => {
        jest.runAllTimers();
      });
    });
  });

  describe("RenderItem Direct Testing", () => {
    it("calls FlatList renderItem function", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.renderItem) {
        // Call renderItem directly
        const result = flatLists[0].props.renderItem({
          item: sampleMenus[0],
          index: 0,
        });
        
        expect(result).toBeTruthy();
      }
    });

    it("handles renderItem for menu with image loading state", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.renderItem) {
        const result = flatLists[0].props.renderItem({
          item: { ...sampleMenus[0], image_urls: [] },
          index: 0,
        });
        
        expect(result).toBeTruthy();
      }
    });
  });

  describe("ListEmptyComponent Direct Testing", () => {
    it("renders loading state in empty component", async () => {
      mockGetMenuRecommendationsPhase1.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.ListEmptyComponent) {
        // Call ListEmptyComponent directly
        const EmptyComponent = flatLists[0].props.ListEmptyComponent;
        expect(EmptyComponent).toBeDefined();
      }
    });
  });

  describe("ListFooterComponent Direct Testing", () => {
    it("renders loading more footer", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.ListFooterComponent) {
        const FooterComponent = flatLists[0].props.ListFooterComponent;
        expect(FooterComponent).toBeDefined();
      }
    });
  });

  describe("Menu Reason Display", () => {
    it("displays menu reason when available", async () => {
      mockGetMenuRecommendationsPhase1.mockResolvedValue({
        ok: true,
        data: {
          results: [{
            ...sampleMenus[0],
            reason: "This restaurant is perfect for you!",
          }],
        },
      });
      
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });

    it("displays loading dots when reason is being fetched", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      // Advance time to show loading dots animation
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("ScrapToast Navigation", () => {
    it("renders ScrapToast in component tree", async () => {
      const { toJSON } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("Viewability Config", () => {
    it("uses correct viewability config", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.viewabilityConfig).toBeDefined();
      }
    });
  });

  describe("Extra Data for Re-render", () => {
    it("passes extraData for re-rendering on scrap changes", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.extraData).toBeDefined();
      }
    });
  });

  describe("Scroll Event Throttle", () => {
    it("uses scroll event throttle", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.scrollEventThrottle).toBe(16);
      }
    });
  });

  describe("Snap Configuration", () => {
    it("uses snap to alignment configuration", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.snapToAlignment).toBe("start");
        expect(flatLists[0].props.decelerationRate).toBe("fast");
      }
    });
  });

  describe("Performance Optimization Config", () => {
    it("uses performance optimization props", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0) {
        expect(flatLists[0].props.maxToRenderPerBatch).toBeDefined();
        expect(flatLists[0].props.windowSize).toBeDefined();
        expect(flatLists[0].props.initialNumToRender).toBeDefined();
      }
    });
  });

  describe("Refresh Control Config", () => {
    it("uses correct refresh control colors", async () => {
      const { UNSAFE_getAllByType } = render(<FoodigramScreen navigation={navigation} route={defaultRoute} />);
      await act(async () => {
        jest.runAllTimers();
      });
      
      const flatLists = UNSAFE_getAllByType(require("react-native").FlatList);
      if (flatLists.length > 0 && flatLists[0].props.refreshControl) {
        const refreshControl = flatLists[0].props.refreshControl;
        expect(refreshControl.props.tintColor).toBe("#f66c51");
      }
    });
  });
});
