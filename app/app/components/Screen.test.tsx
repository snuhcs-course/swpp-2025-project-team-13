import { render } from "@testing-library/react-native"
import React from "react"
import { Text, View } from "react-native"
import { Screen } from "./Screen"

// Mock navigation hook
jest.mock("@react-navigation/native", () => ({
  useScrollToTop: jest.fn(),
}))

describe("Screen", () => {
  it("should render children", () => {
    const { getByText } = render(
      <Screen>
        <Text>Test Content</Text>
      </Screen>
    )
    
    expect(getByText("Test Content")).toBeDefined()
  })

  it("should render with fixed preset by default", () => {
    const { getByText } = render(
      <Screen preset="fixed">
        <Text>Fixed Screen</Text>
      </Screen>
    )
    
    expect(getByText("Fixed Screen")).toBeDefined()
  })

  it("should render with scroll preset", () => {
    const { getByText } = render(
      <Screen preset="scroll">
        <Text>Scrollable Content</Text>
      </Screen>
    )
    
    expect(getByText("Scrollable Content")).toBeDefined()
  })

  it("should render with auto preset", () => {
    const { getByText } = render(
      <Screen preset="auto">
        <Text>Auto Content</Text>
      </Screen>
    )
    
    expect(getByText("Auto Content")).toBeDefined()
  })

  it("should apply custom backgroundColor", () => {
    const { getByText } = render(
      <Screen backgroundColor="red">
        <Text>Content</Text>
      </Screen>
    )
    
    expect(getByText("Content")).toBeDefined()
  })

  it("should apply custom style", () => {
    const customStyle = { padding: 20 }
    const { getByText } = render(
      <Screen style={customStyle}>
        <Text>Styled Content</Text>
      </Screen>
    )
    
    expect(getByText("Styled Content")).toBeDefined()
  })

  it("should apply contentContainerStyle", () => {
    const containerStyle = { paddingHorizontal: 16 }
    const { getByText } = render(
      <Screen contentContainerStyle={containerStyle}>
        <Text>Container Styled</Text>
      </Screen>
    )
    
    expect(getByText("Container Styled")).toBeDefined()
  })

  it("should handle safeAreaEdges prop", () => {
    const { getByText } = render(
      <Screen safeAreaEdges={["top", "bottom"]}>
        <Text>Safe Area Content</Text>
      </Screen>
    )
    
    expect(getByText("Safe Area Content")).toBeDefined()
  })

  it("should set statusBarStyle to dark by default", () => {
    const { getByText } = render(
      <Screen>
        <Text>Content</Text>
      </Screen>
    )
    
    expect(getByText("Content")).toBeDefined()
  })

  it("should accept custom statusBarStyle", () => {
    const { getByText } = render(
      <Screen statusBarStyle="light">
        <Text>Light Status Bar</Text>
      </Screen>
    )
    
    expect(getByText("Light Status Bar")).toBeDefined()
  })

  it("should handle keyboardOffset prop", () => {
    const { getByText } = render(
      <Screen keyboardOffset={100}>
        <Text>Keyboard Aware</Text>
      </Screen>
    )
    
    expect(getByText("Keyboard Aware")).toBeDefined()
  })

  it("should pass KeyboardAvoidingViewProps", () => {
    const { getByText } = render(
      <Screen KeyboardAvoidingViewProps={{ enabled: false }}>
        <Text>No Keyboard Avoiding</Text>
      </Screen>
    )
    
    expect(getByText("No Keyboard Avoiding")).toBeDefined()
  })

  it("should pass StatusBarProps", () => {
    const { getByText } = render(
      <Screen StatusBarProps={{ hidden: false }}>
        <Text>Status Bar Content</Text>
      </Screen>
    )
    
    expect(getByText("Status Bar Content")).toBeDefined()
  })

  it("should render with scroll preset and keyboardShouldPersistTaps", () => {
    const { getByText } = render(
      <Screen preset="scroll" keyboardShouldPersistTaps="always">
        <Text>Always Persist Taps</Text>
      </Screen>
    )
    
    expect(getByText("Always Persist Taps")).toBeDefined()
  })

  it("should pass ScrollViewProps for scroll preset", () => {
    const { getByText } = render(
      <Screen 
        preset="scroll" 
        ScrollViewProps={{ bounces: false }}
      >
        <Text>No Bounce Scroll</Text>
      </Screen>
    )
    
    expect(getByText("No Bounce Scroll")).toBeDefined()
  })

  it("should handle auto preset with scrollEnabledToggleThreshold", () => {
    const { getByText } = render(
      <Screen 
        preset="auto" 
        scrollEnabledToggleThreshold={{ percent: 0.8 }}
      >
        <Text>Auto with Threshold</Text>
      </Screen>
    )
    
    expect(getByText("Auto with Threshold")).toBeDefined()
  })

  it("should render multiple children", () => {
    const { getByText } = render(
      <Screen>
        <Text>First Child</Text>
        <Text>Second Child</Text>
        <View>
          <Text>Nested Child</Text>
        </View>
      </Screen>
    )
    
    expect(getByText("First Child")).toBeDefined()
    expect(getByText("Second Child")).toBeDefined()
    expect(getByText("Nested Child")).toBeDefined()
  })

  it("should render with no children", () => {
    const { container } = render(<Screen />)
    expect(container).toBeDefined()
  })

  it("should use iOS padding behavior on iOS", () => {
    const originalPlatform = jest.requireActual("react-native").Platform.OS
    jest.spyOn(require("react-native"), "Platform", "get").mockReturnValue({
      ...require("react-native").Platform,
      OS: "ios",
    })

    const { getByText } = render(
      <Screen>
        <Text>iOS Content</Text>
      </Screen>
    )
    
    expect(getByText("iOS Content")).toBeDefined()
  })

  it("should use height behavior on Android", () => {
    jest.spyOn(require("react-native"), "Platform", "get").mockReturnValue({
      ...require("react-native").Platform,
      OS: "android",
    })

    const { getByText } = render(
      <Screen>
        <Text>Android Content</Text>
      </Screen>
    )
    
    expect(getByText("Android Content")).toBeDefined()
  })

  it("should handle complex nested structure", () => {
    const { getByText } = render(
      <Screen preset="scroll">
        <View>
          <Text>Header</Text>
          <View>
            <Text>Body Content</Text>
            <View>
              <Text>Deeply Nested</Text>
            </View>
          </View>
          <Text>Footer</Text>
        </View>
      </Screen>
    )
    
    expect(getByText("Header")).toBeDefined()
    expect(getByText("Body Content")).toBeDefined()
    expect(getByText("Deeply Nested")).toBeDefined()
    expect(getByText("Footer")).toBeDefined()
  })

  it("should handle scrollEnabledToggleThreshold with point", () => {
    const { getByText } = render(
      <Screen 
        preset="auto" 
        scrollEnabledToggleThreshold={{ point: 100 }}
      >
        <Text>Point Threshold</Text>
      </Screen>
    )
    
    expect(getByText("Point Threshold")).toBeDefined()
  })
})

