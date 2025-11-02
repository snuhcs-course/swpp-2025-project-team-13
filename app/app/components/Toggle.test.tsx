import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { Toggle } from "./Toggle"

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock")
  Reanimated.default.call = () => {}
  return Reanimated
})

describe("Toggle", () => {
  it("renders checkbox variant", () => {
    const { toJSON } = render(
      <Toggle variant="checkbox" value={false} onValueChange={jest.fn()} />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders switch variant", () => {
    const { toJSON } = render(
      <Toggle variant="switch" value={false} onValueChange={jest.fn()} />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders radio variant", () => {
    const { toJSON } = render(
      <Toggle variant="radio" value={false} onValueChange={jest.fn()} />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with label on right", () => {
    const { getByText } = render(
      <Toggle label="Accept terms" value={false} onValueChange={jest.fn()} />
    )
    expect(getByText("Accept terms")).toBeTruthy()
  })

  it("renders with label on left", () => {
    const { getByText } = render(
      <Toggle 
        label="Notifications"
        labelPosition="left"
        value={false}
        onValueChange={jest.fn()}
      />
    )
    expect(getByText("Notifications")).toBeTruthy()
  })

  it("renders with helper text", () => {
    const { getByText } = render(
      <Toggle 
        label="Toggle"
        helper="This is a helper message"
        value={false}
        onValueChange={jest.fn()}
      />
    )
    expect(getByText("This is a helper message")).toBeTruthy()
  })

  it("calls onValueChange when pressed", () => {
    const onValueChangeMock = jest.fn()
    const { getByA11yState } = render(
      <Toggle variant="checkbox" value={false} onValueChange={onValueChangeMock} />
    )
    fireEvent.press(getByA11yState({ checked: false }))
    expect(onValueChangeMock).toHaveBeenCalledWith(true)
  })

  it("calls onValueChange with false when currently true", () => {
    const onValueChangeMock = jest.fn()
    const { getByA11yState } = render(
      <Toggle variant="checkbox" value={true} onValueChange={onValueChangeMock} />
    )
    fireEvent.press(getByA11yState({ checked: true }))
    expect(onValueChangeMock).toHaveBeenCalledWith(false)
  })

  it("renders with value true", () => {
    const { getByA11yState } = render(
      <Toggle variant="checkbox" value={true} onValueChange={jest.fn()} />
    )
    const toggle = getByA11yState({ checked: true })
    expect(toggle).toBeTruthy()
  })

  it("renders with value false", () => {
    const { getByA11yState } = render(
      <Toggle variant="checkbox" value={false} onValueChange={jest.fn()} />
    )
    const toggle = getByA11yState({ checked: false })
    expect(toggle).toBeTruthy()
  })

  it("is disabled when editable is false", () => {
    const onValueChangeMock = jest.fn()
    const { getByA11yState } = render(
      <Toggle variant="checkbox" value={false} onValueChange={onValueChangeMock} editable={false} />
    )
    const toggle = getByA11yState({ disabled: true })
    fireEvent.press(toggle)
    expect(onValueChangeMock).not.toHaveBeenCalled()
  })

  it("is disabled with status disabled", () => {
    const onValueChangeMock = jest.fn()
    const { getByA11yState } = render(
      <Toggle variant="checkbox" value={false} onValueChange={onValueChangeMock} status="disabled" />
    )
    const toggle = getByA11yState({ disabled: true })
    fireEvent.press(toggle)
    expect(onValueChangeMock).not.toHaveBeenCalled()
  })

  it("renders with error status", () => {
    const { toJSON } = render(
      <Toggle variant="checkbox" value={false} onValueChange={jest.fn()} status="error" />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom containerStyle", () => {
    const { toJSON } = render(
      <Toggle 
        variant="checkbox"
        value={false}
        onValueChange={jest.fn()}
        containerStyle={{ padding: 20 }}
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom inputWrapperStyle", () => {
    const { toJSON } = render(
      <Toggle 
        variant="checkbox"
        value={false}
        onValueChange={jest.fn()}
        inputWrapperStyle={{ margin: 10 }}
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom labelStyle", () => {
    const { toJSON } = render(
      <Toggle 
        variant="checkbox"
        label="Custom Label"
        value={false}
        onValueChange={jest.fn()}
        labelStyle={{ color: "red" }}
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders checkbox with custom icon", () => {
    const { toJSON } = render(
      <Toggle 
        variant="checkbox"
        value={true}
        onValueChange={jest.fn()}
        checkboxIcon="x"
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders switch with text accessibility mode", () => {
    const { toJSON } = render(
      <Toggle 
        variant="switch"
        value={false}
        onValueChange={jest.fn()}
        switchAccessibilityMode="text"
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders switch with icon accessibility mode", () => {
    const { toJSON } = render(
      <Toggle 
        variant="switch"
        value={false}
        onValueChange={jest.fn()}
        switchAccessibilityMode="icon"
      />
    )
    expect(toJSON()).toBeTruthy()
  })
})

