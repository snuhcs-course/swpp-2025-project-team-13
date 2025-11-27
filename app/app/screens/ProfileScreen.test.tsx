import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { ProfileScreen } from "./ProfileScreen";

// Mocks for navigation and store context
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const navigation = { replace: mockReplace, navigate: mockNavigate };

// Mock stores with menuScrapStore
jest.mock("../models", () => ({
  useStores: () => ({
    foodHistoryStore: {
      scrappedItemsList: [],
      scrappedItems: [],
      isScrapped: jest.fn(() => false),
      toggleScrappedItem: jest.fn(),
    },
    menuScrapStore: {
      scrappedMenusList: [],
      scrappedMenus: [],
      isScrapped: jest.fn(() => false),
      toggleScrappedMenu: jest.fn(),
      addScrappedMenu: jest.fn(),
      removeScrappedMenu: jest.fn(),
    },
  }),
}));

jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: () => ({ scanAlbums: jest.fn(), albums: [], scannedImages: [] }),
}));

jest.mock("app/services/api", () => ({
  api: {
    me: jest.fn(() => Promise.resolve({ ok: true, data: { username: "Sophia" } })),
    logout: jest.fn(() => Promise.resolve({ ok: true })),
  },
}));

jest.mock("app/services/aws/handleAwsSignin", () => ({
  handleSignOut: jest.fn(() => Promise.resolve()),
}));

jest.mock("app/utils/storage", () => ({
  remove: jest.fn(() => Promise.resolve()),
}));

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders profile screen", async () => {
    const { toJSON } = render(<ProfileScreen navigation={navigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders bottom navigation", async () => {
    const { getByText, getByTestId } = render(<ProfileScreen navigation={navigation} />);
    expect(getByText("Discover")).toBeTruthy();
    // Use testID for Profile tab to avoid conflict with header title
    expect(getByTestId("UserTab")).toBeTruthy();
  });

  it("renders My Photos section", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} />);
    await waitFor(() => {
      expect(getByText("My Photos")).toBeTruthy();
    });
  });

  it("renders Liked Restaurants section", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} />);
    await waitFor(() => {
      expect(getByText("Liked Restaurants")).toBeTruthy();
    });
  });

  it("renders Edit Profile button", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} />);
    await waitFor(() => {
      expect(getByText("Edit Profile")).toBeTruthy();
    });
  });

  it("renders empty state when no photos", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} />);
    await waitFor(() => {
      expect(getByText("No photos yet")).toBeTruthy();
    });
  });

  it("navigates to Foodigram when Discover tab is pressed", async () => {
    const { getByText } = render(<ProfileScreen navigation={navigation} />);
    
    fireEvent.press(getByText("Discover"));
    
    expect(mockNavigate).toHaveBeenCalledWith("Foodigram");
  });
});
