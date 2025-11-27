import React from "react"
import { renderHook } from "@testing-library/react-native"
import { useSafeAreaInsetsStyle } from "./useSafeAreaInsetsStyle"

// Mock useSafeAreaInsets
const mockInsets = {
  top: 44,
  bottom: 34,
  left: 0,
  right: 0,
}

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => mockInsets,
}))

describe("useSafeAreaInsetsStyle", () => {
  it("returns empty object when no edges specified", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle([]))
    expect(result.current).toEqual({})
  })

  it("returns padding styles for top edge", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["top"]))
    expect(result.current).toEqual({ paddingTop: 44 })
  })

  it("returns padding styles for bottom edge", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["bottom"]))
    expect(result.current).toEqual({ paddingBottom: 34 })
  })

  it("returns padding styles for left edge", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["left"]))
    expect(result.current).toEqual({ paddingStart: 0 })
  })

  it("returns padding styles for right edge", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["right"]))
    expect(result.current).toEqual({ paddingEnd: 0 })
  })

  it("returns padding styles for multiple edges", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["top", "bottom"]))
    expect(result.current).toEqual({
      paddingTop: 44,
      paddingBottom: 34,
    })
  })

  it("returns padding styles for all edges", () => {
    const { result } = renderHook(() =>
      useSafeAreaInsetsStyle(["top", "bottom", "left", "right"])
    )
    expect(result.current).toEqual({
      paddingTop: 44,
      paddingBottom: 34,
      paddingStart: 0,
      paddingEnd: 0,
    })
  })

  it("returns margin styles when property is margin", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["top", "bottom"], "margin"))
    expect(result.current).toEqual({
      marginTop: 44,
      marginBottom: 34,
    })
  })

  it("handles start edge (maps to left)", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["start"]))
    expect(result.current).toEqual({ paddingStart: 0 })
  })

  it("handles end edge (maps to right)", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["end"]))
    expect(result.current).toEqual({ paddingEnd: 0 })
  })

  it("handles mixed edge types", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["top", "start", "end"]))
    expect(result.current).toEqual({
      paddingTop: 44,
      paddingStart: 0,
      paddingEnd: 0,
    })
  })

  it("defaults to padding when property not specified", () => {
    const { result } = renderHook(() => useSafeAreaInsetsStyle(["top"]))
    expect(result.current).toHaveProperty("paddingTop")
    expect(result.current).not.toHaveProperty("marginTop")
  })
})

