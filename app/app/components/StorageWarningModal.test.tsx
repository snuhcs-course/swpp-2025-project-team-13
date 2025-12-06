import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { StorageWarningModal } from "./StorageWarningModal"

describe("StorageWarningModal", () => {
  const defaultProps = {
    visible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<StorageWarningModal {...defaultProps} />)
    expect(getByText("갤러리 접근 비활성화")).toBeTruthy()
    expect(getByText(/갤러리 접근을 허용하지 않을 경우/)).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <StorageWarningModal {...defaultProps} visible={false} />
    )
    expect(queryByText("갤러리 접근 비활성화")).toBeNull()
  })

  it("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn()
    const { getByText } = render(
      <StorageWarningModal {...defaultProps} onCancel={onCancel} />
    )
    fireEvent.press(getByText("취소"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn()
    const { getByText } = render(
      <StorageWarningModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.press(getByText("확인"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when close button (X) is pressed", () => {
    const onCancel = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <StorageWarningModal {...defaultProps} onCancel={onCancel} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
