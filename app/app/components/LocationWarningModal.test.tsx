import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { LocationWarningModal } from "./LocationWarningModal"

describe("LocationWarningModal", () => {
  const defaultProps = {
    visible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<LocationWarningModal {...defaultProps} />)
    expect(getByText("위치 서비스 비활성화")).toBeTruthy()
    expect(getByText(/위치 서비스를 활성화하지 않을 경우/)).toBeTruthy()
  })

  it("does not render content when not visible", () => {
    const { queryByText } = render(
      <LocationWarningModal {...defaultProps} visible={false} />
    )
    expect(queryByText("위치 서비스 비활성화")).toBeNull()
  })

  it("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn()
    const { getByText } = render(
      <LocationWarningModal {...defaultProps} onCancel={onCancel} />
    )
    fireEvent.press(getByText("취소"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn()
    const { getByText } = render(
      <LocationWarningModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.press(getByText("확인"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when close button (X) is pressed", () => {
    const onCancel = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <LocationWarningModal {...defaultProps} onCancel={onCancel} />
    )
    // X 버튼은 첫 번째 TouchableOpacity
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
