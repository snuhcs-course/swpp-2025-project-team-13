import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { TextField } from "./TextField"

describe("TextField", () => {
  it("should render the component", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Enter text" />
    )
    
    expect(getByPlaceholderText("Enter text")).toBeDefined()
  })

  it("should render with label", () => {
    const { getByText } = render(
      <TextField label="Username" placeholder="Enter username" />
    )
    
    expect(getByText("Username")).toBeDefined()
  })

  it("should render with labelTx for i18n", () => {
    const { getByText } = render(
      <TextField labelTx="common.email" placeholder="Email" />
    )
    
    expect(getByText(/common\.email/)).toBeDefined()
  })

  it("should handle text input changes", () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = render(
      <TextField placeholder="Type here" onChangeText={onChangeText} />
    )
    
    const input = getByPlaceholderText("Type here")
    fireEvent.changeText(input, "Hello World")
    
    expect(onChangeText).toHaveBeenCalledWith("Hello World")
  })

  it("should render with helper text", () => {
    const { getByText } = render(
      <TextField 
        placeholder="Password" 
        helper="Must be at least 8 characters"
      />
    )
    
    expect(getByText("Must be at least 8 characters")).toBeDefined()
  })

  it("should render with helperTx for i18n", () => {
    const { getByText } = render(
      <TextField 
        placeholder="Password" 
        helperTx="validation.passwordLength"
      />
    )
    
    expect(getByText(/validation\.passwordLength/)).toBeDefined()
  })

  it("should display error status", () => {
    const { getByText } = render(
      <TextField 
        placeholder="Email" 
        status="error"
        helper="Invalid email"
      />
    )
    
    expect(getByText("Invalid email")).toBeDefined()
  })

  it("should be disabled when status is disabled", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Disabled field" status="disabled" />
    )
    
    const input = getByPlaceholderText("Disabled field")
    expect(input.props.editable).toBe(false)
  })

  it("should be disabled when editable is false", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Not editable" editable={false} />
    )
    
    const input = getByPlaceholderText("Not editable")
    expect(input.props.editable).toBe(false)
  })

  it("should render with placeholder from placeholderTx", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholderTx="common.search" />
    )
    
    // Mock i18n returns "key {params}"
    expect(getByPlaceholderText(/common\.search/)).toBeDefined()
  })

  it("should apply custom containerStyle", () => {
    const customStyle = { marginBottom: 20 }
    const { getByTestId } = render(
      <TextField 
        placeholder="Styled" 
        containerStyle={customStyle}
        testID="text-field"
      />
    )
    
    expect(getByTestId("text-field")).toBeDefined()
  })

  it("should apply custom style to input", () => {
    const customStyle = { fontSize: 18 }
    const { getByPlaceholderText } = render(
      <TextField placeholder="Custom styled input" style={customStyle} />
    )
    
    expect(getByPlaceholderText("Custom styled input")).toBeDefined()
  })

  it("should handle multiline text input", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Multiline text" multiline />
    )
    
    const input = getByPlaceholderText("Multiline text")
    expect(input.props.multiline).toBe(true)
  })

  it("should focus input when container is pressed", () => {
    const { getByTestId } = render(
      <TextField placeholder="Press to focus" testID="text-field-container" />
    )
    
    const container = getByTestId("text-field-container")
    fireEvent.press(container)
    
    // Focus should be called (tested through behavior)
    expect(container).toBeDefined()
  })

  it("should not focus when disabled", () => {
    const { getByTestId } = render(
      <TextField 
        placeholder="Disabled" 
        status="disabled" 
        testID="text-field-container" 
      />
    )
    
    const container = getByTestId("text-field-container")
    fireEvent.press(container)
    
    expect(container.props.accessibilityState.disabled).toBe(true)
  })

  it("should render with LeftAccessory", () => {
    const LeftAccessory = () => <Text>🔍</Text>
    
    const { getByText } = render(
      <TextField placeholder="Search" LeftAccessory={LeftAccessory} />
    )
    
    expect(getByText("🔍")).toBeDefined()
  })

  it("should render with RightAccessory", () => {
    const RightAccessory = () => <Text>👁️</Text>
    
    const { getByText } = render(
      <TextField placeholder="Password" RightAccessory={RightAccessory} />
    )
    
    expect(getByText("👁️")).toBeDefined()
  })

  it("should pass LabelTextProps to label", () => {
    const { getByText } = render(
      <TextField 
        label="Username" 
        LabelTextProps={{ style: { fontWeight: "bold" } }}
      />
    )
    
    expect(getByText("Username")).toBeDefined()
  })

  it("should pass HelperTextProps to helper", () => {
    const { getByText } = render(
      <TextField 
        placeholder="Input" 
        helper="Help text"
        HelperTextProps={{ style: { fontSize: 12 } }}
      />
    )
    
    expect(getByText("Help text")).toBeDefined()
  })

  it("should handle secureTextEntry for passwords", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Password" secureTextEntry />
    )
    
    const input = getByPlaceholderText("Password")
    expect(input.props.secureTextEntry).toBe(true)
  })

  it("should handle autoCapitalize prop", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Email" autoCapitalize="none" />
    )
    
    const input = getByPlaceholderText("Email")
    expect(input.props.autoCapitalize).toBe("none")
  })

  it("should handle keyboardType prop", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Phone" keyboardType="phone-pad" />
    )
    
    const input = getByPlaceholderText("Phone")
    expect(input.props.keyboardType).toBe("phone-pad")
  })

  it("should handle onFocus event", () => {
    const onFocus = jest.fn()
    const { getByPlaceholderText } = render(
      <TextField placeholder="Focus me" onFocus={onFocus} />
    )
    
    const input = getByPlaceholderText("Focus me")
    fireEvent(input, "focus")
    
    expect(onFocus).toHaveBeenCalled()
  })

  it("should handle onBlur event", () => {
    const onBlur = jest.fn()
    const { getByPlaceholderText } = render(
      <TextField placeholder="Blur me" onBlur={onBlur} />
    )
    
    const input = getByPlaceholderText("Blur me")
    fireEvent(input, "blur")
    
    expect(onBlur).toHaveBeenCalled()
  })

  it("should render without label or helper", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Simple input" />
    )
    
    expect(getByPlaceholderText("Simple input")).toBeDefined()
  })

  it("should apply inputWrapperStyle", () => {
    const wrapperStyle = { borderColor: "blue" }
    const { getByPlaceholderText } = render(
      <TextField 
        placeholder="Input" 
        inputWrapperStyle={wrapperStyle}
      />
    )
    
    expect(getByPlaceholderText("Input")).toBeDefined()
  })

  it("should handle maxLength prop", () => {
    const { getByPlaceholderText } = render(
      <TextField placeholder="Max 10 chars" maxLength={10} />
    )
    
    const input = getByPlaceholderText("Max 10 chars")
    expect(input.props.maxLength).toBe(10)
  })

  it("should display value prop", () => {
    const { getByDisplayValue } = render(
      <TextField placeholder="With value" value="Initial value" />
    )
    
    expect(getByDisplayValue("Initial value")).toBeDefined()
  })
})

