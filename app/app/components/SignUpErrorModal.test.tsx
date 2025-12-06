import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { SignUpErrorModal } from "./SignUpErrorModal"

describe("SignUpErrorModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<SignUpErrorModal {...defaultProps} />)
    expect(getByText("회원가입 실패")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <SignUpErrorModal {...defaultProps} visible={false} />
    )
    expect(queryByText("회원가입 실패")).toBeNull()
  })

  it("displays default error message when no errorMessage prop", () => {
    const { getByText } = render(<SignUpErrorModal {...defaultProps} />)
    expect(getByText("회원가입에 실패했습니다.")).toBeTruthy()
  })

  it("converts 'username already exists' to Korean", () => {
    const { getByText } = render(
      <SignUpErrorModal {...defaultProps} errorMessage="username already exists" />
    )
    expect(getByText("이미 사용 중인 아이디입니다.")).toBeTruthy()
  })

  it("converts 'email already exists' to Korean", () => {
    const { getByText } = render(
      <SignUpErrorModal {...defaultProps} errorMessage="email already exists" />
    )
    expect(getByText("이미 사용 중인 이메일입니다.")).toBeTruthy()
  })

  it("converts password error to Korean", () => {
    const { getByText } = render(
      <SignUpErrorModal {...defaultProps} errorMessage="password requirements not met" />
    )
    expect(getByText("비밀번호가 요구사항을 충족하지 않습니다.")).toBeTruthy()
  })

  it("converts network error to Korean", () => {
    const { getByText } = render(
      <SignUpErrorModal {...defaultProps} errorMessage="network connection error" />
    )
    expect(getByText("네트워크 연결을 확인해주세요.")).toBeTruthy()
  })

  it("displays original Korean message as-is", () => {
    const { getByText } = render(
      <SignUpErrorModal {...defaultProps} errorMessage="커스텀 한국어 메시지" />
    )
    expect(getByText("커스텀 한국어 메시지")).toBeTruthy()
  })

  it("calls onClose when confirm button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <SignUpErrorModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("확인"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <SignUpErrorModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
