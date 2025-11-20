import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { Alert } from "react-native"
import { LoginScreen } from "./LoginScreen"

const mockReplace = jest.fn()
const navigation = { replace: mockReplace }

const mockLoginUser = jest.fn().mockResolvedValue({ success: true, hasPreferences: true })

jest.mock("lucide-react-native", () => ({
  Eye: () => null,
  EyeOff: () => null,
}))

jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    loginUser: (...args: any[]) => mockLoginUser(...args),
    registerUser: jest.fn(),
    logoutUser: jest.fn(),
  },
}))

jest.spyOn(Alert, "alert").mockImplementation(() => {})

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoginUser.mockResolvedValue({ success: true, hasPreferences: true })
  })

  it("shows alert when username or password missing", async () => {
    const { getByTestId } = render(<LoginScreen navigation={navigation} />)

    fireEvent.press(getByTestId("login-submit-button"))

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("아이디와 비밀번호를 입력해주세요.")
    })
  })

  it("navigates to Foodigram when facade indicates preferences exist", async () => {
    const { getByTestId } = render(<LoginScreen navigation={navigation} />)

    fireEvent.changeText(getByTestId("login-username-input"), "tester")
    fireEvent.changeText(getByTestId("login-password-input"), "password123")
    fireEvent.press(getByTestId("login-submit-button"))

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith({ username: "tester", password: "password123" })
      expect(mockReplace).toHaveBeenCalledWith("Foodigram")
    })
  })

  it("navigates to onboarding when preferences are missing", async () => {
    mockLoginUser.mockResolvedValue({ success: true, hasPreferences: false })
    const { getByTestId } = render(<LoginScreen navigation={navigation} />)

    fireEvent.changeText(getByTestId("login-username-input"), "tester")
    fireEvent.changeText(getByTestId("login-password-input"), "password123")
    fireEvent.press(getByTestId("login-submit-button"))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("Onboarding")
    })
  })

  it("shows facade error message on failure", async () => {
    mockLoginUser.mockResolvedValue({ success: false, errorMessage: "서버 오류" })
    const { getByTestId } = render(<LoginScreen navigation={navigation} />)

    fireEvent.changeText(getByTestId("login-username-input"), "tester")
    fireEvent.changeText(getByTestId("login-password-input"), "password123")
    fireEvent.press(getByTestId("login-submit-button"))

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("로그인 실패", "서버 오류")
    })
  })
})
