import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { VerificationCodeModal } from "./VerificationCodeModal"

describe("VerificationCodeModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onCodeVerify: jest.fn(),
    email: "test@example.com",
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText, getByPlaceholderText } = render(
      <VerificationCodeModal {...defaultProps} />
    )
    expect(getByText("인증 코드 입력")).toBeTruthy()
    expect(getByText(/test@example.com로/)).toBeTruthy()
    expect(getByPlaceholderText("123456")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <VerificationCodeModal {...defaultProps} visible={false} />
    )
    expect(queryByText("인증 코드 입력")).toBeNull()
  })

  it("calls onClose when cancel button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <VerificationCodeModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("취소"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onCodeVerify when code is incomplete", () => {
    const onCodeVerify = jest.fn()
    const { getByPlaceholderText, getAllByText } = render(
      <VerificationCodeModal {...defaultProps} onCodeVerify={onCodeVerify} />
    )
    
    const codeInput = getByPlaceholderText("123456")
    fireEvent.changeText(codeInput, "12345") // 5자리만 입력
    
    const confirmButtons = getAllByText("확인")
    fireEvent.press(confirmButtons[confirmButtons.length - 1])
    
    expect(onCodeVerify).not.toHaveBeenCalled()
  })

  it("calls onCodeVerify when correct code is entered", () => {
    const onCodeVerify = jest.fn()
    const { getByPlaceholderText, getAllByText } = render(
      <VerificationCodeModal {...defaultProps} onCodeVerify={onCodeVerify} />
    )
    
    const codeInput = getByPlaceholderText("123456")
    fireEvent.changeText(codeInput, "123456")
    
    const confirmButtons = getAllByText("확인")
    fireEvent.press(confirmButtons[confirmButtons.length - 1])
    
    expect(onCodeVerify).toHaveBeenCalledWith("123456")
  })

  it("shows error message when incorrect code is entered", () => {
    const onCodeVerify = jest.fn()
    const { getByPlaceholderText, getAllByText, getByText } = render(
      <VerificationCodeModal {...defaultProps} onCodeVerify={onCodeVerify} />
    )
    
    const codeInput = getByPlaceholderText("123456")
    fireEvent.changeText(codeInput, "654321") // 잘못된 코드
    
    const confirmButtons = getAllByText("확인")
    fireEvent.press(confirmButtons[confirmButtons.length - 1])
    
    expect(getByText("인증 코드가 올바르지 않습니다.")).toBeTruthy()
    expect(onCodeVerify).not.toHaveBeenCalled()
  })

  it("only allows numeric input and limits to 6 characters", () => {
    const { getByPlaceholderText } = render(
      <VerificationCodeModal {...defaultProps} />
    )
    
    const codeInput = getByPlaceholderText("123456")
    fireEvent.changeText(codeInput, "abc123def456789")
    
    // 숫자만 남고, 6자리로 제한됨
    expect(codeInput.props.value).toBe("123456")
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <VerificationCodeModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("clears error when typing new code", () => {
    const { getByPlaceholderText, getAllByText, queryByText } = render(
      <VerificationCodeModal {...defaultProps} />
    )
    
    const codeInput = getByPlaceholderText("123456")
    fireEvent.changeText(codeInput, "654321")
    
    const confirmButtons = getAllByText("확인")
    fireEvent.press(confirmButtons[confirmButtons.length - 1])
    
    // 에러 메시지 확인
    expect(queryByText("인증 코드가 올바르지 않습니다.")).toBeTruthy()
    
    // 새로 입력하면 에러 사라짐
    fireEvent.changeText(codeInput, "1")
    expect(queryByText("인증 코드가 올바르지 않습니다.")).toBeNull()
  })
})
