import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { LoginErrorModal } from "./LoginErrorModal"

describe("LoginErrorModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<LoginErrorModal {...defaultProps} />)
    expect(getByText("로그인 오류")).toBeTruthy()
  })

  it("displays default error message when no errorMessage prop", () => {
    const { getByText } = render(<LoginErrorModal {...defaultProps} />)
    expect(getByText("로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.")).toBeTruthy()
  })

  it("displays custom error message when provided", () => {
    const { getByText } = render(
      <LoginErrorModal {...defaultProps} errorMessage="커스텀 에러 메시지" />
    )
    expect(getByText("커스텀 에러 메시지")).toBeTruthy()
  })

  it("calls onClose when confirm button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <LoginErrorModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("확인"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <LoginErrorModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <LoginErrorModal {...defaultProps} visible={false} />
    )
    expect(queryByText("로그인 오류")).toBeNull()
  })
})
