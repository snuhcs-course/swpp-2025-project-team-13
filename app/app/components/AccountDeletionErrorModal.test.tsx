import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { AccountDeletionErrorModal } from "./AccountDeletionErrorModal"

describe("AccountDeletionErrorModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<AccountDeletionErrorModal {...defaultProps} />)
    expect(getByText("계정 삭제 실패")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <AccountDeletionErrorModal {...defaultProps} visible={false} />
    )
    expect(queryByText("계정 삭제 실패")).toBeNull()
  })

  it("displays default error message when no errorMessage prop", () => {
    const { getByText } = render(<AccountDeletionErrorModal {...defaultProps} />)
    expect(getByText("계정 삭제에 실패했습니다.")).toBeTruthy()
  })

  it("converts 'invalid password' to Korean", () => {
    const { getByText } = render(
      <AccountDeletionErrorModal {...defaultProps} errorMessage="invalid password" />
    )
    expect(getByText("비밀번호가 올바르지 않습니다.")).toBeTruthy()
  })

  it("converts AWS deletion error to Korean", () => {
    const { getByText } = render(
      <AccountDeletionErrorModal {...defaultProps} errorMessage="aws 삭제 failed" />
    )
    expect(getByText("AWS 계정 삭제에 실패했습니다. 다시 시도해주세요.")).toBeTruthy()
  })

  it("converts network error to Korean", () => {
    const { getByText } = render(
      <AccountDeletionErrorModal {...defaultProps} errorMessage="network connection error" />
    )
    expect(getByText("네트워크 연결을 확인해주세요.")).toBeTruthy()
  })

  it("displays original Korean message as-is", () => {
    const { getByText } = render(
      <AccountDeletionErrorModal {...defaultProps} errorMessage="커스텀 한국어 메시지" />
    )
    expect(getByText("커스텀 한국어 메시지")).toBeTruthy()
  })

  it("calls onClose when confirm button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <AccountDeletionErrorModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("확인"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <AccountDeletionErrorModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    // touchables[0] is overlay, touchables[1] is container, touchables[2] is close button
    fireEvent.press(touchables[2])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
