import { render } from "@testing-library/react-native"
import React from "react"
import { View, Text } from "react-native"
import { Screen } from "./Screen"
import { SafeAreaProvider } from "react-native-safe-area-context"

const renderWithSafeArea = (component: React.ReactElement) => {
  return render(
    <SafeAreaProvider>
      {component}
    </SafeAreaProvider>
  )
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

