import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { SignUpScreen } from "./SignUpScreen"
import { Alert } from "react-native"

// Mock navigation
const mockReplace = jest.fn()
const mockNavigate = jest.fn()
const navigation = { replace: mockReplace, navigate: mockNavigate } as any

// Mock storage
jest.mock("app/utils/storage", () => ({
  saveString: jest.fn(() => Promise.resolve()),
}))

// Mock API functions
const mockRegister = jest.fn()
const mockGetCsrf = jest.fn()

jest.mock("app/services/api", () => ({
  api: {
    register: (...args: any[]) => mockRegister(...args),
    getCsrf: (...args: any[]) => mockGetCsrf(...args),
  },
}))

// Mock AWS Amplify
jest.mock("aws-amplify/auth", () => ({
  signUp: jest.fn(() =>
    Promise.resolve({
      isSignUpComplete: true,
      userId: "test-user-id",
      nextStep: {},
    })
  ),
}))

// Mock lucide-react-native
jest.mock("lucide-react-native", () => ({
  Eye: "Eye",
  EyeOff: "EyeOff",
}))

// Mock Alert
jest.spyOn(Alert, "alert")

describe("SignUpScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCsrf.mockResolvedValue({ ok: true })
  })

  it("renders sign up form correctly", () => {
    const { getByText, getByPlaceholderText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    expect(getByText("Create Your Account")).toBeTruthy()
    expect(getByPlaceholderText("Enter your full name")).toBeTruthy()
    expect(getByPlaceholderText("Enter your email address")).toBeTruthy()
    expect(getByPlaceholderText("Enter your password")).toBeTruthy()
    expect(getByText("Sign Up")).toBeTruthy()
  })

  it("shows error when fields are empty", async () => {
    const { getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.press(getByText("Sign Up"))
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Please fill in all fields.")
    })
  })

  it("shows error when password is too short", async () => {
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "Test User")
    fireEvent.changeText(getByPlaceholderText("Enter your email address"), "test@example.com")
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "short")
    fireEvent.press(getByText("Sign Up"))
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Password must be at least 8 characters long."
      )
    })
  })

  it("shows error when email format is invalid", async () => {
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "Test User")
    fireEvent.changeText(getByPlaceholderText("Enter your email address"), "invalid-email")
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "password123")
    fireEvent.press(getByText("Sign Up"))
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please enter a valid email address."
      )
    })
  })

  it("successfully registers with valid information", async () => {
    mockRegister.mockResolvedValue({ ok: true, data: {} })
    
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "Test User")
    fireEvent.changeText(getByPlaceholderText("Enter your email address"), "test@example.com")
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "password123")
    fireEvent.press(getByText("Sign Up"))
    
    await waitFor(() => {
      expect(mockGetCsrf).toHaveBeenCalled()
      expect(mockRegister).toHaveBeenCalledWith("Test User", "test@example.com", "password123")
      expect(Alert.alert).toHaveBeenCalledWith(
        "Success",
        "Your account has been created!",
        expect.any(Array)
      )
    })
  })

  it("shows error on registration failure", async () => {
    mockRegister.mockResolvedValue({ ok: false, data: { detail: "Email already exists" } })
    
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "Test User")
    fireEvent.changeText(getByPlaceholderText("Enter your email address"), "existing@example.com")
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "password123")
    fireEvent.press(getByText("Sign Up"))
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Sign Up Failed", "Email already exists")
    })
  })

  it("navigates to login when login link is pressed", () => {
    const { getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.press(getByText("Log in"))
    
    expect(mockNavigate).toHaveBeenCalledWith("Login")
  })

  it("handles API error gracefully", async () => {
    mockRegister.mockRejectedValue(new Error("Network error"))
    
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={navigation} route={{} as any} />
    )
    
    fireEvent.changeText(getByPlaceholderText("Enter your full name"), "Test User")
    fireEvent.changeText(getByPlaceholderText("Enter your email address"), "test@example.com")
    fireEvent.changeText(getByPlaceholderText("Enter your password"), "password123")
    fireEvent.press(getByText("Sign Up"))
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "An error occurred during sign up.")
    })
  })
})
