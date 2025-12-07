import { render, fireEvent, act } from "@testing-library/react-native"
import React from "react"
import { ScrapToast } from "./ScrapToast"

// Mock Animated
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native")
  RN.Animated.timing = () => ({
    start: (callback?: () => void) => callback && callback(),
  })
  RN.Animated.parallel = (animations: any[]) => ({
    start: (callback?: () => void) => {
      animations.forEach((anim) => anim.start())
      callback && callback()
    },
  })
  RN.Animated.spring = () => ({
    start: (callback?: () => void) => callback && callback(),
  })
  return RN
})

describe("ScrapToast", () => {
  const defaultProps = {
    visible: true,
    onDismiss: jest.fn(),
    onNavigate: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<ScrapToast {...defaultProps} />)
    expect(getByText("스크랩 탭에서 확인하세요")).toBeTruthy()
    expect(getByText("보러가기")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <ScrapToast {...defaultProps} visible={false} />
    )
    expect(queryByText("스크랩 탭에서 확인하세요")).toBeNull()
  })

  it("calls onNavigate when navigate button is pressed", () => {
    const onNavigate = jest.fn()
    const { getByText } = render(
      <ScrapToast {...defaultProps} onNavigate={onNavigate} />
    )
    fireEvent.press(getByText("보러가기"))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("auto dismisses after 4 seconds", () => {
    const onDismiss = jest.fn()
    render(<ScrapToast {...defaultProps} onDismiss={onDismiss} />)
    
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    
    expect(onDismiss).toHaveBeenCalled()
  })

  it("renders with correct structure", () => {
    const { toJSON } = render(<ScrapToast {...defaultProps} />)
    expect(toJSON()).toBeTruthy()
  })
})
