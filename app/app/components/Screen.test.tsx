import { render } from "@testing-library/react-native"
import React from "react"
import { View, Text } from "react-native"
import { Screen } from "./Screen"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as ReactNavigation from "@react-navigation/native"

// Mock useScrollToTop to avoid requiring a navigator/route context in unit tests
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native")
  return {
    ...actual,
    useScrollToTop: jest.fn(),
  }
})

const renderWithSafeArea = (component: React.ReactElement) => {
  // Provide initial metrics so hooks depending on safe area can compute styles synchronously in tests
  const initialMetrics = {
    frame: { x: 0, y: 0, width: 320, height: 640 },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  }
  return render(<SafeAreaProvider initialMetrics={initialMetrics}>{component}</SafeAreaProvider>)
}

describe("Screen", () => {
  it("renders with fixed preset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="fixed">
        <Text>Fixed Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with scroll preset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll">
        <Text>Scrollable Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with auto preset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="auto">
        <Text>Auto Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders children", () => {
    const { getByText } = renderWithSafeArea(
      <Screen>
        <Text>Test Content</Text>
      </Screen>
    )
    expect(getByText("Test Content")).toBeTruthy()
  })

  it("applies custom backgroundColor", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen backgroundColor="#ff0000">
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom style", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen style={{ padding: 20 }}>
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies contentContainerStyle", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen contentContainerStyle={{ padding: 10 }}>
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("sets statusBarStyle to light", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen statusBarStyle="light">
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("sets statusBarStyle to dark", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen statusBarStyle="dark">
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies keyboardOffset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen keyboardOffset={20}>
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies safeAreaEdges", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen safeAreaEdges={["top", "bottom"]}>
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with keyboardShouldPersistTaps", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll" keyboardShouldPersistTaps="always">
        <Text>Content</Text>
      </Screen>
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with multiple children", () => {
    const { getByText } = renderWithSafeArea(
      <Screen>
        <Text>First</Text>
        <Text>Second</Text>
        <Text>Third</Text>
      </Screen>
    )
    expect(getByText("First")).toBeTruthy()
    expect(getByText("Second")).toBeTruthy()
    expect(getByText("Third")).toBeTruthy()
  })
})

