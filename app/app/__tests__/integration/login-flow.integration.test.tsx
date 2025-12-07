/**
 * Login Flow Integration Test
 * Tests user authentication from login to main app or onboarding.
 */

import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { LoginScreen } from "../../screens/LoginScreen"

const mockReplace = jest.fn()
const mockNavigate = jest.fn()
const navigation = { replace: mockReplace, navigate: mockNavigate } as any

const mockLoginUser = jest.fn()
jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    loginUser: (...args: any[]) => mockLoginUser(...args),
    registerUser: jest.fn(),
    logoutUser: jest.fn(),
  },
}))

describe("Login Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoginUser.mockResolvedValue({ success: true, hasPreferences: true })
  })

  it("renders login form correctly", () => {
    const { getByTestId } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    expect(getByTestId("login-username-input")).toBeTruthy()
    expect(getByTestId("login-password-input")).toBeTruthy()
    expect(getByTestId("login-submit-button")).toBeTruthy()
  })

  it("shows signup link", () => {
    const { getByText } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    expect(getByText("회원가입")).toBeTruthy()
  })

  it("navigates to signup screen when link pressed", () => {
    const { getByText } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByText("회원가입"))
    expect(mockNavigate).toHaveBeenCalledWith("SignUp")
  })

  it("shows validation error when fields are empty", async () => {
    const { getByTestId, getByText } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByTestId("login-submit-button"))
    await waitFor(() => {
      expect(getByText("아이디와 비밀번호를 입력해주세요.")).toBeTruthy()
    })
  })

  it("calls loginUser with correct credentials", async () => {
    const { getByTestId } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.changeText(getByTestId("login-username-input"), "testuser")
    fireEvent.changeText(getByTestId("login-password-input"), "password123")
    fireEvent.press(getByTestId("login-submit-button"))
    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith({
        username: "testuser",
        password: "password123",
      })
    })
  })

  it("navigates to Foodigram on successful login with preferences", async () => {
    mockLoginUser.mockResolvedValue({ success: true, hasPreferences: true })
    const { getByTestId } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.changeText(getByTestId("login-username-input"), "testuser")
    fireEvent.changeText(getByTestId("login-password-input"), "password123")
    fireEvent.press(getByTestId("login-submit-button"))
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("Foodigram")
    })
  })

  it("navigates to Onboarding when preferences missing", async () => {
    mockLoginUser.mockResolvedValue({ success: true, hasPreferences: false })
    const { getByTestId } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.changeText(getByTestId("login-username-input"), "testuser")
    fireEvent.changeText(getByTestId("login-password-input"), "password123")
    fireEvent.press(getByTestId("login-submit-button"))
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("Onboarding")
    })
  })

  it("shows error on invalid credentials", async () => {
    mockLoginUser.mockResolvedValue({ success: false, errorMessage: "Invalid credentials" })
    const { getByTestId, getByText } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.changeText(getByTestId("login-username-input"), "wrong")
    fireEvent.changeText(getByTestId("login-password-input"), "wrong")
    fireEvent.press(getByTestId("login-submit-button"))
    await waitFor(() => {
      expect(getByText("아이디나 비밀번호를 확인하세요.")).toBeTruthy()
    })
  })

  it("shows network error on exception", async () => {
    mockLoginUser.mockRejectedValue(new Error("Network error"))
    const { getByTestId, getByText } = render(<LoginScreen navigation={navigation} route={{} as any} />)
    fireEvent.changeText(getByTestId("login-username-input"), "user")
    fireEvent.changeText(getByTestId("login-password-input"), "pass")
    fireEvent.press(getByTestId("login-submit-button"))
    await waitFor(() => {
      expect(getByText("로그인 중 문제가 발생했습니다.")).toBeTruthy()
    })
  })
})

