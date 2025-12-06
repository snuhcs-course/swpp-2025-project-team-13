import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { PasswordRetrievalModal } from "./PasswordRetrievalModal"

describe("PasswordRetrievalModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onEmailSubmit: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText, getByPlaceholderText } = render(
      <PasswordRetrievalModal {...defaultProps} />
    )
    expect(getByText("비밀번호 찾기")).toBeTruthy()
    expect(getByText(/계정의 이메일 주소를 입력하시면/)).toBeTruthy()
    expect(getByPlaceholderText("이메일을 입력하세요")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <PasswordRetrievalModal {...defaultProps} visible={false} />
    )
    expect(queryByText("비밀번호 찾기")).toBeNull()
  })

  it("calls onClose when cancel button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <PasswordRetrievalModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("취소"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onEmailSubmit when email is empty", () => {
    const onEmailSubmit = jest.fn()
    const { getByText } = render(
      <PasswordRetrievalModal {...defaultProps} onEmailSubmit={onEmailSubmit} />
    )
    fireEvent.press(getByText("전송"))
    expect(onEmailSubmit).not.toHaveBeenCalled()
  })

  it("calls onEmailSubmit with email when email is entered and submit button pressed", () => {
    const onEmailSubmit = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <PasswordRetrievalModal {...defaultProps} onEmailSubmit={onEmailSubmit} />
    )
    
    const emailInput = getByPlaceholderText("이메일을 입력하세요")
    fireEvent.changeText(emailInput, "test@example.com")
    
    fireEvent.press(getByText("전송"))
    
    expect(onEmailSubmit).toHaveBeenCalledWith("test@example.com")
  })

  it("trims whitespace from email before submitting", () => {
    const onEmailSubmit = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <PasswordRetrievalModal {...defaultProps} onEmailSubmit={onEmailSubmit} />
    )
    
    const emailInput = getByPlaceholderText("이메일을 입력하세요")
    fireEvent.changeText(emailInput, "  test@example.com  ")
    
    fireEvent.press(getByText("전송"))
    
    expect(onEmailSubmit).toHaveBeenCalledWith("test@example.com")
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <PasswordRetrievalModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("clears email when close is pressed", () => {
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <PasswordRetrievalModal {...defaultProps} onClose={onClose} />
    )
    
    const emailInput = getByPlaceholderText("이메일을 입력하세요")
    fireEvent.changeText(emailInput, "test@example.com")
    
    fireEvent.press(getByText("취소"))
    expect(onClose).toHaveBeenCalled()
  })
})
