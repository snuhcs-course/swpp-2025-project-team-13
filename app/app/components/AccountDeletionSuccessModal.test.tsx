import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { AccountDeletionSuccessModal } from "./AccountDeletionSuccessModal"

describe("AccountDeletionSuccessModal", () => {
  const defaultProps = {
    visible: true,
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<AccountDeletionSuccessModal {...defaultProps} />)
    expect(getByText("탈퇴가 완료되었습니다.")).toBeTruthy()
    expect(getByText(/그동안 서비스를 이용해주셔서/)).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <AccountDeletionSuccessModal {...defaultProps} visible={false} />
    )
    expect(queryByText("탈퇴가 완료되었습니다.")).toBeNull()
  })

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn()
    const { getByText } = render(
      <AccountDeletionSuccessModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.press(getByText("확인"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("renders success icon", () => {
    const { toJSON } = render(<AccountDeletionSuccessModal {...defaultProps} />)
    expect(toJSON()).toBeTruthy()
  })
})
