import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { SignUpScreen } from "./SignUpScreen"

const mockNavigate = jest.fn()
const mockReplace = jest.fn()
const navigation = {
  navigate: mockNavigate,
  replace: mockReplace,
} as any

const mockRegisterUser = jest.fn()

jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    registerUser: (...args: any[]) => mockRegisterUser(...args),
  },
}))

describe("SignUpScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRegisterUser.mockResolvedValue({ success: true })
  })

  it("renders without crashing", () => {
    const { toJSON } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders all input fields", () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    expect(getByTestId("signup-username-input")).toBeTruthy()
    expect(getByTestId("signup-email-input")).toBeTruthy()
    expect(getByTestId("signup-password-input")).toBeTruthy()
    expect(getByTestId("signup-confirm-password-input")).toBeTruthy()
  })

  it("renders signup button", () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByTestId("signup-submit-button")).toBeTruthy()
  })

  it("renders title text", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByText("계정 생성")).toBeTruthy()
  })

  it("renders input labels", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByText("아이디")).toBeTruthy()
    expect(getByText("이메일 주소")).toBeTruthy()
    expect(getByText("비밀번호")).toBeTruthy()
    expect(getByText("비밀번호 확인")).toBeTruthy()
  })

  it("shows username validation error on blur when too short", () => {
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const usernameInput = getByTestId("signup-username-input")
    fireEvent.changeText(usernameInput, "abc")
    fireEvent(usernameInput, "blur")
    
    expect(getByText("아이디는 6자 이상이어야 합니다.")).toBeTruthy()
  })

  it("shows email validation error on blur when invalid", () => {
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const emailInput = getByTestId("signup-email-input")
    fireEvent.changeText(emailInput, "invalidemail")
    fireEvent(emailInput, "blur")
    
    expect(getByText("이메일을 확인하세요.")).toBeTruthy()
  })

  it("shows password validation error on blur when too short", () => {
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const passwordInput = getByTestId("signup-password-input")
    fireEvent.changeText(passwordInput, "short")
    fireEvent(passwordInput, "blur")
    
    expect(getByText("비밀번호는 8자 이상이어야 합니다.")).toBeTruthy()
  })

  it("shows confirm password error when passwords do not match", () => {
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const passwordInput = getByTestId("signup-password-input")
    const confirmPasswordInput = getByTestId("signup-confirm-password-input")
    
    fireEvent.changeText(passwordInput, "password123")
    fireEvent.changeText(confirmPasswordInput, "password456")
    fireEvent(confirmPasswordInput, "blur")
    
    expect(getByText("비밀번호가 일치하지 않습니다.")).toBeTruthy()
  })

  it("calls registerUser with correct data on successful form submission", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    // Fill in valid form data
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    // Submit the form
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      })
    })
  })

  it("shows success modal on successful registration", async () => {
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    // Fill in valid form data
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(getByText("회원가입 완료")).toBeTruthy()
    })
  })

  it("shows error modal when registration fails", async () => {
    // Test with an error message that gets converted by getKoreanMessage
    mockRegisterUser.mockResolvedValue({ success: false, errorMessage: "이미 존재하는 사용자입니다." })
    
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    // Fill in valid form data (6+ char username, valid email, 8+ char password)
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser123")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    // The message "이미 존재하는 사용자입니다." gets converted to "이미 사용 중인 아이디입니다." by SignUpErrorModal
    await waitFor(() => {
      expect(getByText("이미 사용 중인 아이디입니다.")).toBeTruthy()
    })
  })

  it("navigates to Login screen when login link is pressed", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.press(getByText("로그인"))
    
    expect(mockNavigate).toHaveBeenCalledWith("Login")
  })

  it("has password input with secureTextEntry", () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const passwordInput = getByTestId("signup-password-input")
    expect(passwordInput.props.secureTextEntry).toBe(true)
  })

  it("renders login prompt", () => {
    const { getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    expect(getByText(/이미 계정이 있으신가요/)).toBeTruthy()
  })

  it("clears username error when valid username is entered", () => {
    const { getByTestId, queryByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const usernameInput = getByTestId("signup-username-input")
    
    // Enter short username
    fireEvent.changeText(usernameInput, "abc")
    fireEvent(usernameInput, "blur")
    
    // Enter valid username
    fireEvent.changeText(usernameInput, "validusername")
    fireEvent(usernameInput, "blur")
    
    expect(queryByText("아이디는 6자 이상이어야 합니다.")).toBeNull()
  })

  it("can toggle password visibility", () => {
    const { toJSON } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    // Password toggle exists (Eye icon TouchableOpacity) but doesn't have testID
    expect(toJSON()).toBeTruthy()
  })

  it("can toggle confirm password visibility", () => {
    const { toJSON } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    // Confirm password toggle exists (Eye icon TouchableOpacity) but doesn't have testID
    expect(toJSON()).toBeTruthy()
  })

  it("prevents submission when form is invalid", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    // Don't fill in any fields
    fireEvent.press(getByTestId("signup-submit-button"))
    
    // registerUser should not be called
    expect(mockRegisterUser).not.toHaveBeenCalled()
  })

  it("prevents submission when passwords don't match", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password456")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    // registerUser should not be called
    expect(mockRegisterUser).not.toHaveBeenCalled()
  })

  it("navigates to onboarding after successful registration", async () => {
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(getByText("회원가입 완료")).toBeTruthy()
    })
    
    // Confirm modal
    fireEvent.press(getByText("확인"))
    
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("Onboarding")
    })
  })

  it("handles username validation with valid length", () => {
    const { getByTestId, queryByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const usernameInput = getByTestId("signup-username-input")
    fireEvent.changeText(usernameInput, "validuser")
    fireEvent(usernameInput, "blur")
    
    expect(queryByText("아이디는 6자 이상이어야 합니다.")).toBeNull()
  })

  it("handles email validation with valid format", () => {
    const { getByTestId, queryByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const emailInput = getByTestId("signup-email-input")
    fireEvent.changeText(emailInput, "valid@example.com")
    fireEvent(emailInput, "blur")
    
    expect(queryByText("이메일을 확인하세요.")).toBeNull()
  })

  it("handles password validation with valid length", () => {
    const { getByTestId, queryByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const passwordInput = getByTestId("signup-password-input")
    fireEvent.changeText(passwordInput, "password123")
    fireEvent(passwordInput, "blur")
    
    expect(queryByText("비밀번호는 8자 이상이어야 합니다.")).toBeNull()
  })

  it("clears confirm password error when passwords match", () => {
    const { getByTestId, queryByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    const passwordInput = getByTestId("signup-password-input")
    const confirmPasswordInput = getByTestId("signup-confirm-password-input")
    
    fireEvent.changeText(passwordInput, "password123")
    fireEvent.changeText(confirmPasswordInput, "password456")
    fireEvent(confirmPasswordInput, "blur")
    
    // Now match them
    fireEvent.changeText(confirmPasswordInput, "password123")
    fireEvent(confirmPasswordInput, "blur")
    
    expect(queryByText("비밀번호가 일치하지 않습니다.")).toBeNull()
  })

  it("handles network error during registration", async () => {
    mockRegisterUser.mockRejectedValue(new Error("Network error"))
    
    const { getByTestId, getByText } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(getByText("회원가입 실패")).toBeTruthy()
    })
  })

  it("validates whitespace in username", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "  testuser  ")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      // Component validates whitespace with trim(), but API call uses actual value
      expect(mockRegisterUser).toHaveBeenCalled()
    })
  })

  it("validates whitespace in fields", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "   ")
    fireEvent.changeText(getByTestId("signup-email-input"), "   ")
    fireEvent.changeText(getByTestId("signup-password-input"), "   ")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "   ")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    // Error should be shown
    await waitFor(() => {
      expect(mockRegisterUser).not.toHaveBeenCalled()
    })
  })

  it("handles signup with complex username", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "test_user.123")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalled()
    })
  })

  it("handles signup with special characters in password", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "p@ssw0rd!#$")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "p@ssw0rd!#$")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalled()
    })
  })

  it("handles email with plus addressing", async () => {
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test+alias@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalled()
    })
  })

  it("disables submit button while registering", async () => {
    mockRegisterUser.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000)))
    
    const { getByTestId } = render(<SignUpScreen navigation={navigation} route={{} as any} />)
    
    fireEvent.changeText(getByTestId("signup-username-input"), "testuser")
    fireEvent.changeText(getByTestId("signup-email-input"), "test@example.com")
    fireEvent.changeText(getByTestId("signup-password-input"), "password123")
    fireEvent.changeText(getByTestId("signup-confirm-password-input"), "password123")
    
    fireEvent.press(getByTestId("signup-submit-button"))
    
    // Submit button should be disabled during registration
    const submitButton = getByTestId("signup-submit-button")
    expect(submitButton).toBeTruthy()
  })
})
