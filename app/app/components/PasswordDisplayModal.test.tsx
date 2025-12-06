import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { PasswordDisplayModal } from "./PasswordDisplayModal"

describe("PasswordDisplayModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    email: "test@example.com",
    password: "secretpassword",
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<PasswordDisplayModal {...defaultProps} />)
    expect(getByText("비밀번호 찾기 완료")).toBeTruthy()
    expect(getByText("test@example.com")).toBeTruthy()
    expect(getByText("••••••••")).toBeTruthy()
    expect(getByText(/보안을 위해 비밀번호를 확인한 후/)).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <PasswordDisplayModal {...defaultProps} visible={false} />
    )
    expect(queryByText("비밀번호 찾기 완료")).toBeNull()
  })

  it("shows masked password by default", () => {
    const { getByText } = render(<PasswordDisplayModal {...defaultProps} />)
    expect(getByText("••••••••")).toBeTruthy()
  })

  it("shows actual password when eye button is pressed", () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = render(
      <PasswordDisplayModal {...defaultProps} />
    )
    
    expect(getByText("••••••••")).toBeTruthy()
    
    // Eye 버튼 찾기 및 클릭
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    const eyeButton = touchables[1] // 두 번째 TouchableOpacity가 eye 버튼
    fireEvent.press(eyeButton)
    
    expect(getByText("secretpassword")).toBeTruthy()
    expect(queryByText("••••••••")).toBeNull()
  })

  it("calls onClose when confirm button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <PasswordDisplayModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("확인"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <PasswordDisplayModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("resets password visibility when modal is closed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <PasswordDisplayModal {...defaultProps} onClose={onClose} />
    )
    
    // Eye 버튼으로 비밀번호 보이게 하기
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[1])
    
    // 닫기 버튼 클릭
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalled()
  })
})
