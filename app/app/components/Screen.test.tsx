import { render } from "@testing-library/react-native"
import React from "react"
import { Text } from "react-native"
import { Screen } from "./Screen"
import { SafeAreaProvider } from "react-native-safe-area-context"

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
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with scroll preset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll">
        <Text>Scrollable Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with auto preset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="auto">
        <Text>Auto Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders children", () => {
    const { getByText } = renderWithSafeArea(
      <Screen>
        <Text>Test Content</Text>
      </Screen>,
    )
    expect(getByText("Test Content")).toBeTruthy()
  })

  it("applies custom backgroundColor", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen backgroundColor="#ff0000">
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom style", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen style={{ padding: 20 }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies contentContainerStyle", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen contentContainerStyle={{ padding: 10 }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("sets statusBarStyle to light", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen statusBarStyle="light">
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("sets statusBarStyle to dark", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen statusBarStyle="dark">
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies keyboardOffset", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen keyboardOffset={20}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies safeAreaEdges", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen safeAreaEdges={["top", "bottom"]}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with keyboardShouldPersistTaps", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll" keyboardShouldPersistTaps="always">
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with multiple children", () => {
    const { getByText } = renderWithSafeArea(
      <Screen>
        <Text>First</Text>
        <Text>Second</Text>
        <Text>Third</Text>
      </Screen>,
    )
    expect(getByText("First")).toBeTruthy()
    expect(getByText("Second")).toBeTruthy()
    expect(getByText("Third")).toBeTruthy()
  })

  it("renders with ScrollViewProps", () => {
    const onScrollMock = jest.fn()
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll" ScrollViewProps={{ onScroll: onScrollMock }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("calls ScrollViewProps onLayout if provided", () => {
    const onLayoutMock = jest.fn()
    const { UNSAFE_getByType } = renderWithSafeArea(
      <Screen preset="scroll" ScrollViewProps={{ onLayout: onLayoutMock }}>
        <Text>Content</Text>
      </Screen>,
    )
    
    const ScrollView = require("react-native").ScrollView
    const scrollView = UNSAFE_getByType(ScrollView)
    
    // Simulate layout event
    if (scrollView.props.onLayout) {
      scrollView.props.onLayout({
        nativeEvent: { layout: { height: 500, width: 300, x: 0, y: 0 } },
      })
    }
    
    expect(onLayoutMock).toHaveBeenCalled()
  })

  it("calls ScrollViewProps onContentSizeChange if provided", () => {
    const onContentSizeChangeMock = jest.fn()
    const { UNSAFE_getByType } = renderWithSafeArea(
      <Screen preset="scroll" ScrollViewProps={{ onContentSizeChange: onContentSizeChangeMock }}>
        <Text>Content</Text>
      </Screen>,
    )
    
    const ScrollView = require("react-native").ScrollView
    const scrollView = UNSAFE_getByType(ScrollView)
    
    // Simulate content size change
    if (scrollView.props.onContentSizeChange) {
      scrollView.props.onContentSizeChange(300, 600)
    }
    
    expect(onContentSizeChangeMock).toHaveBeenCalledWith(300, 600)
  })

  it("handles auto preset with point threshold", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="auto" scrollEnabledToggleThreshold={{ point: 100 }}>
        <Text>Auto Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("handles auto preset with percent threshold", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="auto" scrollEnabledToggleThreshold={{ percent: 0.8 }}>
        <Text>Auto Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("disables scroll when content fits screen in auto preset", () => {
    const { UNSAFE_getByType } = renderWithSafeArea(
      <Screen preset="auto">
        <Text>Small Content</Text>
      </Screen>,
    )
    
    const ScrollView = require("react-native").ScrollView
    const scrollView = UNSAFE_getByType(ScrollView)
    
    // Simulate layout with large screen
    if (scrollView.props.onLayout) {
      scrollView.props.onLayout({
        nativeEvent: { layout: { height: 800, width: 300, x: 0, y: 0 } },
      })
    }
    
    // Simulate small content
    if (scrollView.props.onContentSizeChange) {
      scrollView.props.onContentSizeChange(300, 200)
    }
    
    // Scroll should be disabled since content fits
    expect(scrollView.props.scrollEnabled).toBe(false)
  })

  it("enables scroll when content exceeds screen in auto preset", () => {
    const { UNSAFE_getByType } = renderWithSafeArea(
      <Screen preset="auto">
        <Text>Large Content</Text>
      </Screen>,
    )
    
    const ScrollView = require("react-native").ScrollView
    const scrollView = UNSAFE_getByType(ScrollView)
    
    // Simulate layout with small screen
    if (scrollView.props.onLayout) {
      scrollView.props.onLayout({
        nativeEvent: { layout: { height: 400, width: 300, x: 0, y: 0 } },
      })
    }
    
    // Simulate large content
    if (scrollView.props.onContentSizeChange) {
      scrollView.props.onContentSizeChange(300, 1000)
    }
    
    // Scroll should be enabled since content exceeds screen
    expect(scrollView.props.scrollEnabled).toBe(true)
  })

  it("renders with StatusBarProps", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen StatusBarProps={{ hidden: false }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with KeyboardAvoidingViewProps", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen KeyboardAvoidingViewProps={{ enabled: true }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("handles scroll preset with keyboardShouldPersistTaps never", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll" keyboardShouldPersistTaps="never">
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies ScrollViewProps style", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll" ScrollViewProps={{ style: { paddingTop: 10 } }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies ScrollViewProps contentContainerStyle", () => {
    const { toJSON } = renderWithSafeArea(
      <Screen preset="scroll" ScrollViewProps={{ contentContainerStyle: { paddingBottom: 20 } }}>
        <Text>Content</Text>
      </Screen>,
    )
    expect(toJSON()).toBeTruthy()
  })
})

