import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { AccountDeletionWarningModal } from "./AccountDeletionWarningModal"

describe("AccountDeletionWarningModal", () => {
  const defaultProps = {
    visible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<AccountDeletionWarningModal {...defaultProps} />)
    expect(getByText("계정 탈퇴")).toBeTruthy()
    expect(getByText("정말 탈퇴하시겠습니까?")).toBeTruthy()
    expect(getByText(/계정을 탈퇴하면 모든 데이터가/)).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <AccountDeletionWarningModal {...defaultProps} visible={false} />
    )
    expect(queryByText("계정 탈퇴")).toBeNull()
  })

  it("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn()
    const { getByText } = render(
      <AccountDeletionWarningModal {...defaultProps} onCancel={onCancel} />
    )
    fireEvent.press(getByText("취소"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn()
    const { getByText } = render(
      <AccountDeletionWarningModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.press(getByText("탈퇴하기"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when close button (X) is pressed", () => {
    const onCancel = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <AccountDeletionWarningModal {...defaultProps} onCancel={onCancel} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
