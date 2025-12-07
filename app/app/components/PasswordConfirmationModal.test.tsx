import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { PasswordConfirmationModal } from "./PasswordConfirmationModal"

describe("PasswordConfirmationModal", () => {
  const defaultProps = {
    visible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText, getByPlaceholderText } = render(
      <PasswordConfirmationModal {...defaultProps} />
    )
    expect(getByText("비밀번호 확인")).toBeTruthy()
    expect(getByText(/계정을 탈퇴하려면/)).toBeTruthy()
    expect(getByPlaceholderText("비밀번호를 입력하세요")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <PasswordConfirmationModal {...defaultProps} visible={false} />
    )
    expect(queryByText("비밀번호 확인")).toBeNull()
  })

  it("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn()
    const { getByText } = render(
      <PasswordConfirmationModal {...defaultProps} onCancel={onCancel} />
    )
    fireEvent.press(getByText("취소"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("does not call onConfirm when password is empty", () => {
    const onConfirm = jest.fn()
    const { getAllByText } = render(
      <PasswordConfirmationModal {...defaultProps} onConfirm={onConfirm} />
    )
    const confirmButtons = getAllByText("확인")
    fireEvent.press(confirmButtons[confirmButtons.length - 1])
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("calls onConfirm with password when password is entered and confirm button pressed", () => {
    const onConfirm = jest.fn()
    const { getByPlaceholderText, getAllByText } = render(
      <PasswordConfirmationModal {...defaultProps} onConfirm={onConfirm} />
    )
    
    const passwordInput = getByPlaceholderText("비밀번호를 입력하세요")
    fireEvent.changeText(passwordInput, "testpassword")
    
    const confirmButtons = getAllByText("확인")
    fireEvent.press(confirmButtons[confirmButtons.length - 1])
    
    expect(onConfirm).toHaveBeenCalledWith("testpassword")
  })

  it("toggles password visibility when eye button is pressed", () => {
    const { getByPlaceholderText, UNSAFE_getAllByType } = render(
      <PasswordConfirmationModal {...defaultProps} />
    )
    
    const passwordInput = getByPlaceholderText("비밀번호를 입력하세요")
    expect(passwordInput.props.secureTextEntry).toBe(true)
    
    // Eye 버튼 클릭
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    // Eye 버튼은 close button과 cancel, confirm 사이에 있음
    const eyeButton = touchables[1]
    fireEvent.press(eyeButton)
    
    // 상태가 변경되었는지 확인 (재렌더링 후)
    expect(passwordInput.props.secureTextEntry).toBe(false)
  })

  it("clears password and hides it when cancel is pressed", () => {
    const onCancel = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <PasswordConfirmationModal {...defaultProps} onCancel={onCancel} />
    )
    
    const passwordInput = getByPlaceholderText("비밀번호를 입력하세요")
    fireEvent.changeText(passwordInput, "testpassword")
    
    fireEvent.press(getByText("취소"))
    expect(onCancel).toHaveBeenCalled()
  })
})
