import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { ExitConfirmationModal } from "./ExitConfirmationModal"

describe("ExitConfirmationModal", () => {
  const defaultProps = {
    visible: true,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<ExitConfirmationModal {...defaultProps} />)
    expect(getByText("앱 종료")).toBeTruthy()
    expect(getByText("앱을 종료하시겠어요?")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <ExitConfirmationModal {...defaultProps} visible={false} />
    )
    expect(queryByText("앱 종료")).toBeNull()
  })

  it("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn()
    const { getByText } = render(
      <ExitConfirmationModal {...defaultProps} onCancel={onCancel} />
    )
    fireEvent.press(getByText("취소"))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn()
    const { getByText } = render(
      <ExitConfirmationModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.press(getByText("확인"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when close button (X) is pressed", () => {
    const onCancel = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <ExitConfirmationModal {...defaultProps} onCancel={onCancel} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
