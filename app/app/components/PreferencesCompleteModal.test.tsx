import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { PreferencesCompleteModal } from "./PreferencesCompleteModal"

describe("PreferencesCompleteModal", () => {
  const defaultProps = {
    visible: true,
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<PreferencesCompleteModal {...defaultProps} />)
    expect(getByText("취향 설정 완료")).toBeTruthy()
    expect(getByText("맛집 추천 준비가 완료되었어요!")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <PreferencesCompleteModal {...defaultProps} visible={false} />
    )
    expect(queryByText("취향 설정 완료")).toBeNull()
  })

  it("calls onConfirm when confirm button is pressed", () => {
    const onConfirm = jest.fn()
    const { getByText } = render(
      <PreferencesCompleteModal {...defaultProps} onConfirm={onConfirm} />
    )
    fireEvent.press(getByText("확인"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("renders success icon", () => {
    const { toJSON } = render(<PreferencesCompleteModal {...defaultProps} />)
    expect(toJSON()).toBeTruthy()
  })
})
