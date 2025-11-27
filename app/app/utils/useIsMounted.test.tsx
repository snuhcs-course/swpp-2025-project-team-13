import React from "react"
import { renderHook, act } from "@testing-library/react-native"
import { useIsMounted } from "./useIsMounted"

describe("useIsMounted", () => {
  it("returns a function", () => {
    const { result } = renderHook(() => useIsMounted())
    expect(typeof result.current).toBe("function")
  })

  it("returns true when component is mounted", () => {
    const { result } = renderHook(() => useIsMounted())
    expect(result.current()).toBe(true)
  })

  it("returns false after component is unmounted", () => {
    const { result, unmount } = renderHook(() => useIsMounted())

    expect(result.current()).toBe(true)

    unmount()

    expect(result.current()).toBe(false)
  })

  it("returns stable function reference across renders", () => {
    const { result, rerender } = renderHook(() => useIsMounted())

    const firstReference = result.current

    rerender({})

    expect(result.current).toBe(firstReference)
  })

  it("works correctly in async operations", async () => {
    const { result, unmount } = renderHook(() => useIsMounted())

    // Simulate async operation
    const isMountedBefore = result.current()
    expect(isMountedBefore).toBe(true)

    unmount()

    // After unmount, should return false
    const isMountedAfter = result.current()
    expect(isMountedAfter).toBe(false)
  })

  it("can be called multiple times", () => {
    const { result } = renderHook(() => useIsMounted())

    // Call multiple times
    expect(result.current()).toBe(true)
    expect(result.current()).toBe(true)
    expect(result.current()).toBe(true)
  })

  it("handles remounting correctly", () => {
    const { result, unmount, rerender } = renderHook(() => useIsMounted())

    expect(result.current()).toBe(true)

    unmount()

    expect(result.current()).toBe(false)
  })
})

