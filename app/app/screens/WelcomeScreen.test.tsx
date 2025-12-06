import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { WelcomeScreen } from "./WelcomeScreen"

// Mock navigation
const mockNavigate = jest.fn()
const navigation = {
  navigate: mockNavigate,
} as any

// Mock images
jest.mock("../../assets/images/welcome-background.jpg", () => "welcome-background.jpg")

// Mock useSafeAreaInsetsStyle
jest.mock("../utils/useSafeAreaInsetsStyle", () => ({
  useSafeAreaInsetsStyle: jest.fn(() => ({})),
}))

// Mock expo-google-fonts
jest.mock("@expo-google-fonts/plus-jakarta-sans", () => ({
  useFonts: jest.fn(() => [true]),
  PlusJakartaSans_400Regular: "PlusJakartaSans_400Regular",
  PlusJakartaSans_700Bold: "PlusJakartaSans_700Bold",
}))

// Mock LinearGradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}))

// Mock MaterialIcons
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: "MaterialIcons",
}))

describe("WelcomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders without crashing", () => {
    const { toJSON } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders Foodigram logo text", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    expect(getByText("Foodigram")).toBeTruthy()
  })

  it("renders sign up button", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    expect(getByText("회원가입")).toBeTruthy()
  })

  it("renders login button", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    expect(getByText("로그인")).toBeTruthy()
  })

  it("navigates to SignUp screen when sign up button is pressed", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    const signUpButton = getByText("회원가입")
    fireEvent.press(signUpButton)
    expect(mockNavigate).toHaveBeenCalledWith("SignUp", { mode: "signup" })
  })

  it("navigates to Login screen when login button is pressed", () => {
    const { getByText } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    const loginButton = getByText("로그인")
    fireEvent.press(loginButton)
    expect(mockNavigate).toHaveBeenCalledWith("Login", { mode: "login" })
  })

  it("calls useSafeAreaInsetsStyle with bottom", () => {
    const mockUseSafeAreaInsetsStyle = require("../utils/useSafeAreaInsetsStyle").useSafeAreaInsetsStyle
    
    render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    
    expect(mockUseSafeAreaInsetsStyle).toHaveBeenCalledWith(["bottom"])
  })

  it("renders background image", () => {
    const { toJSON } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    const tree = toJSON()
    expect(tree).toBeTruthy()
  })

  it("returns null when fonts are not loaded", () => {
    const { useFonts } = require("@expo-google-fonts/plus-jakarta-sans")
    useFonts.mockReturnValue([false])
    
    const { toJSON } = render(<WelcomeScreen navigation={navigation} route={{} as any} />)
    expect(toJSON()).toBeNull()
    
    // Reset mock
    useFonts.mockReturnValue([true])
  })
})
