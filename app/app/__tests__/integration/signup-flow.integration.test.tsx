/**
 * Signup Flow Integration Test
 * Tests user registration flow from signup to onboarding.
 */

import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { SignUpScreen } from "../../screens/SignUpScreen"

const mockReplace = jest.fn()
const mockNavigate = jest.fn()
const navigation = { replace: mockReplace, navigate: mockNavigate } as any

const mockRegisterUser = jest.fn()
jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    registerUser: (...args: any[]) => mockRegisterUser(...args),
    loginUser: jest.fn(),
    logoutUser: jest.fn(),
  },
}))

describe("Signup Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRegisterUser.mockResolvedValue({ success: true })
  })

  it("renders signup form correctly", () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByTestId("signup-username-input")).toBeTruthy()
    expect(getByTestId("signup-email-input")).toBeTruthy()
    expect(getByTestId("signup-password-input")).toBeTruthy()
    expect(getByTestId("signup-confirm-password-input")).toBeTruthy()
    expect(getByTestId("signup-submit-button")).toBeTruthy()
  })

  it("shows page title", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByText("계정 생성")).toBeTruthy()
  })

  it("shows login link", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByText("로그인")).toBeTruthy()
  })

  it("navigates to login when link pressed", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    fireEvent.press(getByText("로그인"))
    expect(mockNavigate).toHaveBeenCalledWith("Login")
  })

  it("button is disabled when form is empty", () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    const button = getByTestId("signup-submit-button")
    expect(button.props.accessibilityState?.disabled).toBe(true)
  })

  it("shows field labels", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByText("아이디")).toBeTruthy()
    expect(getByText("이메일 주소")).toBeTruthy()
    expect(getByText("비밀번호")).toBeTruthy()
    expect(getByText("비밀번호 확인")).toBeTruthy()
  })

  it("button is enabled when form is valid", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser123")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123!")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123!")
    
    await waitFor(() => {
      const button = getByTestId("signup-submit-button")
      expect(button.props.accessibilityState?.disabled).toBe(false)
    })
  })

  it("calls registerUser when form submitted", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser123")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123!")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123!")
    
    await waitFor(() => {
      expect(getByTestId("signup-submit-button").props.accessibilityState?.disabled).toBe(false)
    })
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalled()
    })
  })

  it("shows success modal on successful registration", async () => {
    mockRegisterUser.mockResolvedValue({ success: true })
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "newuser123")
    fireEvent.changeText(getByTestId("signup-email-input"), "new@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123!")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123!")
    
    await waitFor(() => {
      expect(getByTestId("signup-submit-button").props.accessibilityState?.disabled).toBe(false)
    })
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    // Actual modal shows "회원가입 완료" not "회원가입 성공"
    await waitFor(() => {
      expect(getByText("회원가입 완료")).toBeTruthy()
    })
  })

  it("shows error modal on API failure", async () => {
    mockRegisterUser.mockResolvedValue({ success: false, errorMessage: "이미 사용 중인 아이디입니다." })
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "existing123")
    fireEvent.changeText(getByTestId("signup-email-input"), "ex@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123!")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123!")
    
    await waitFor(() => {
      expect(getByTestId("signup-submit-button").props.accessibilityState?.disabled).toBe(false)
    })
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(getByText("이미 사용 중인 아이디입니다.")).toBeTruthy()
    })
  })
})

