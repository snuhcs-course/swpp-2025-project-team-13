import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { LogoutConfirmationModal } from "./LogoutConfirmationModal"

describe("LogoutConfirmationModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders correctly when visible", () => {
    const { getByText, getAllByText } = render(<LogoutConfirmationModal {...defaultProps} />)
    expect(getAllByText("로그아웃").length).toBeGreaterThan(0)
    expect(getByText("정말로 로그아웃하시겠습니까?")).toBeTruthy()
    expect(getByText(/스크랩한 메뉴는 유지됩니다/)).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <LogoutConfirmationModal {...defaultProps} visible={false} />
    )
    expect(queryByText("로그아웃")).toBeNull()
  })

  it("calls onClose when cancel button is pressed", () => {
    const onClose = jest.fn()
    const { getByText } = render(
      <LogoutConfirmationModal {...defaultProps} onClose={onClose} />
    )
    fireEvent.press(getByText("취소"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onConfirm when logout button is pressed", () => {
    const onConfirm = jest.fn()
    const { getAllByText } = render(
      <LogoutConfirmationModal {...defaultProps} onConfirm={onConfirm} />
    )
    // "로그아웃" 텍스트가 여러 개 있을 수 있으므로 버튼의 것을 선택
    const logoutButtons = getAllByText("로그아웃")
    fireEvent.press(logoutButtons[logoutButtons.length - 1])
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close button (X) is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <LogoutConfirmationModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
