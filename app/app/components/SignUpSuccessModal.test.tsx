import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { SignUpSuccessModal } from "./SignUpSuccessModal"

describe("SignUpSuccessModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<SignUpSuccessModal {...defaultProps} />)
    expect(getByText("회원가입 완료")).toBeTruthy()
    expect(getByText("맛집 여정을 시작해보세요!")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <SignUpSuccessModal {...defaultProps} visible={false} />
    )
    expect(queryByText("회원가입 완료")).toBeNull()
  })

  it("calls onClose when confirm button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <SignUpSuccessModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("확인"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <SignUpSuccessModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("renders success icon", () => {
    const { toJSON } = render(<SignUpSuccessModal {...defaultProps} />)
    expect(toJSON()).toBeTruthy()
  })
})
