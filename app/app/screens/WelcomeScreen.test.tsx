import React from "react";
import { render } from "@testing-library/react-native";
import { WelcomeScreen } from "./WelcomeScreen";

// Mock navigation
const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate };

// Mock images
jest.mock("../../assets/images/welcome-background.jpg", () => "welcome-background.jpg");

// Mock useSafeAreaInsetsStyle
jest.mock("../utils/useSafeAreaInsetsStyle", () => ({
  useSafeAreaInsetsStyle: jest.fn(() => ({})),
}));

// Mock expo-google-fonts - return loaded state
jest.mock("@expo-google-fonts/plus-jakarta-sans", () => ({
  useFonts: jest.fn(() => [true]),
  PlusJakartaSans_400Regular: "PlusJakartaSans_400Regular",
  PlusJakartaSans_700Bold: "PlusJakartaSans_700Bold",
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock @expo/vector-icons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}));

describe("WelcomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { toJSON } = render(<WelcomeScreen navigation={navigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders Foodigram logo text", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} />);
    expect(getByText("Foodigram")).toBeTruthy();
  });

  it("renders subtitle text", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} />);
    expect(getByText("Your personalized food journey starts here")).toBeTruthy();
  });

  it("renders Sign Up button", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} />);
    expect(getByText("Sign Up")).toBeTruthy();
  });

  it("renders Log In button", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} />);
    expect(getByText("Log In")).toBeTruthy();
  });

  it("has proper container structure", () => {
    const { toJSON } = render(<WelcomeScreen navigation={navigation} />);
    const tree = toJSON();
    // Just verify tree is rendered correctly, not null
    expect(tree).toBeTruthy();
    expect(tree).toHaveProperty("type", "View");
  });

  it("applies safe area insets to bottom container", () => {
    const mockUseSafeAreaInsetsStyle = require("../utils/useSafeAreaInsetsStyle").useSafeAreaInsetsStyle;
    
    render(<WelcomeScreen navigation={navigation} />);
    
    expect(mockUseSafeAreaInsetsStyle).toHaveBeenCalledWith(["bottom"]);
  });

  it("returns null when fonts are not loaded", () => {
    // Override the mock for this test
    const useFontsMock = require("@expo-google-fonts/plus-jakarta-sans").useFonts;
    useFontsMock.mockReturnValueOnce([false]);
    
    const { toJSON } = render(<WelcomeScreen navigation={navigation} />);
    expect(toJSON()).toBeNull();
  });
});
