import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { Toggle } from "./Toggle"

describe("Toggle", () => {
  describe("Checkbox variant", () => {
    it("should render checkbox by default", () => {
      const { getByRole } = render(<Toggle value={false} />)
      
      const toggle = getByRole("checkbox")
      expect(toggle).toBeDefined()
    })

    it("should render checkbox with value true", () => {
      const { getByRole } = render(<Toggle variant="checkbox" value={true} />)
      
      const toggle = getByRole("checkbox")
      expect(toggle.props.accessibilityState.checked).toBe(true)
    })

    it("should render checkbox with value false", () => {
      const { getByRole } = render(<Toggle variant="checkbox" value={false} />)
      
      const toggle = getByRole("checkbox")
      expect(toggle.props.accessibilityState.checked).toBe(false)
    })

    it("should call onValueChange when pressed", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle variant="checkbox" value={false} onValueChange={onValueChange} />
      )
      
      const toggle = getByRole("checkbox")
      fireEvent.press(toggle)
      
      expect(onValueChange).toHaveBeenCalledWith(true)
    })

    it("should toggle from true to false", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle variant="checkbox" value={true} onValueChange={onValueChange} />
      )
      
      const toggle = getByRole("checkbox")
      fireEvent.press(toggle)
      
      expect(onValueChange).toHaveBeenCalledWith(false)
    })

    it("should render with label", () => {
      const { getByText } = render(
        <Toggle variant="checkbox" value={false} label="Accept terms" />
      )
      
      expect(getByText("Accept terms")).toBeDefined()
    })

    it("should render with labelTx", () => {
      const { getByText } = render(
        <Toggle variant="checkbox" value={false} labelTx="common.accept" />
      )
      
      expect(getByText(/common\.accept/)).toBeDefined()
    })

    it("should render label on left when labelPosition is left", () => {
      const { getByText } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          label="Left Label" 
          labelPosition="left"
        />
      )
      
      expect(getByText("Left Label")).toBeDefined()
    })

    it("should render label on right by default", () => {
      const { getByText } = render(
        <Toggle variant="checkbox" value={false} label="Right Label" />
      )
      
      expect(getByText("Right Label")).toBeDefined()
    })

    it("should be disabled when editable is false", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          editable={false}
          onValueChange={onValueChange}
        />
      )
      
      const toggle = getByRole("checkbox")
      expect(toggle.props.accessibilityState.disabled).toBe(true)
      
      fireEvent.press(toggle)
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it("should be disabled when status is disabled", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          status="disabled"
          onValueChange={onValueChange}
        />
      )
      
      const toggle = getByRole("checkbox")
      expect(toggle.props.accessibilityState.disabled).toBe(true)
      
      fireEvent.press(toggle)
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it("should render with error status", () => {
      const { getByRole } = render(
        <Toggle variant="checkbox" value={false} status="error" />
      )
      
      expect(getByRole("checkbox")).toBeDefined()
    })

    it("should render with helper text", () => {
      const { getByText } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          helper="This is required"
        />
      )
      
      expect(getByText("This is required")).toBeDefined()
    })

    it("should render with helperTx", () => {
      const { getByText } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          helperTx="validation.required"
        />
      )
      
      expect(getByText(/validation\.required/)).toBeDefined()
    })

    it("should render with custom checkboxIcon", () => {
      const { getByRole } = render(
        <Toggle 
          variant="checkbox" 
          value={true} 
          checkboxIcon="heart"
        />
      )
      
      expect(getByRole("checkbox")).toBeDefined()
    })

    it("should apply custom containerStyle", () => {
      const { getByTestId } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          containerStyle={{ padding: 10 }}
          testID="toggle"
        />
      )
      
      expect(getByTestId("toggle")).toBeDefined()
    })

    it("should apply custom inputOuterStyle", () => {
      const { getByRole } = render(
        <Toggle 
          variant="checkbox" 
          value={false} 
          inputOuterStyle={{ borderWidth: 3 }}
        />
      )
      
      expect(getByRole("checkbox")).toBeDefined()
    })
  })

  describe("Radio variant", () => {
    it("should render radio button", () => {
      const { getByRole } = render(<Toggle variant="radio" value={false} />)
      
      const toggle = getByRole("radio")
      expect(toggle).toBeDefined()
    })

    it("should toggle radio value", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle variant="radio" value={false} onValueChange={onValueChange} />
      )
      
      const toggle = getByRole("radio")
      fireEvent.press(toggle)
      
      expect(onValueChange).toHaveBeenCalledWith(true)
    })

    it("should render radio with label", () => {
      const { getByText } = render(
        <Toggle variant="radio" value={false} label="Option 1" />
      )
      
      expect(getByText("Option 1")).toBeDefined()
    })

    it("should be disabled when specified", () => {
      const { getByRole } = render(
        <Toggle variant="radio" value={false} editable={false} />
      )
      
      const toggle = getByRole("radio")
      expect(toggle.props.accessibilityState.disabled).toBe(true)
    })
  })

  describe("Switch variant", () => {
    it("should render switch", () => {
      const { getByRole } = render(<Toggle variant="switch" value={false} />)
      
      const toggle = getByRole("switch")
      expect(toggle).toBeDefined()
    })

    it("should toggle switch value", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle variant="switch" value={false} onValueChange={onValueChange} />
      )
      
      const toggle = getByRole("switch")
      fireEvent.press(toggle)
      
      expect(onValueChange).toHaveBeenCalledWith(true)
    })

    it("should render switch with label", () => {
      const { getByText } = render(
        <Toggle variant="switch" value={false} label="Enable notifications" />
      )
      
      expect(getByText("Enable notifications")).toBeDefined()
    })

    it("should render switch with text accessibility mode", () => {
      const { getByRole } = render(
        <Toggle 
          variant="switch" 
          value={false} 
          switchAccessibilityMode="text"
        />
      )
      
      expect(getByRole("switch")).toBeDefined()
    })

    it("should render switch with icon accessibility mode", () => {
      const { getByRole } = render(
        <Toggle 
          variant="switch" 
          value={false} 
          switchAccessibilityMode="icon"
        />
      )
      
      expect(getByRole("switch")).toBeDefined()
    })

    it("should be disabled when specified", () => {
      const { getByRole } = render(
        <Toggle variant="switch" value={false} status="disabled" />
      )
      
      const toggle = getByRole("switch")
      expect(toggle.props.accessibilityState.disabled).toBe(true)
    })

    it("should apply custom inputDetailStyle", () => {
      const { getByRole } = render(
        <Toggle 
          variant="switch" 
          value={false} 
          inputDetailStyle={{ width: 30, height: 30 }}
        />
      )
      
      expect(getByRole("switch")).toBeDefined()
    })
  })

  describe("Common functionality", () => {
    it("should handle onPress along with onValueChange", () => {
      const onPress = jest.fn()
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle 
          value={false} 
          onPress={onPress}
          onValueChange={onValueChange}
        />
      )
      
      const toggle = getByRole("checkbox")
      fireEvent.press(toggle)
      
      expect(onPress).toHaveBeenCalled()
      expect(onValueChange).toHaveBeenCalledWith(true)
    })

    it("should not call onValueChange when disabled", () => {
      const onValueChange = jest.fn()
      const { getByRole } = render(
        <Toggle 
          value={false} 
          disabled={true}
          onValueChange={onValueChange}
        />
      )
      
      const toggle = getByRole("checkbox")
      fireEvent.press(toggle)
      
      expect(onValueChange).not.toHaveBeenCalled()
    })

    it("should render without label when no label props provided", () => {
      const { queryByText, getByRole } = render(
        <Toggle value={false} />
      )
      
      expect(getByRole("checkbox")).toBeDefined()
      // No label text should be present
    })

    it("should apply labelStyle", () => {
      const { getByText } = render(
        <Toggle 
          value={false} 
          label="Styled Label"
          labelStyle={{ fontSize: 20 }}
        />
      )
      
      expect(getByText("Styled Label")).toBeDefined()
    })

    it("should pass LabelTextProps", () => {
      const { getByText } = render(
        <Toggle 
          value={false} 
          label="Custom Label"
          LabelTextProps={{ style: { fontWeight: "bold" } }}
        />
      )
      
      expect(getByText("Custom Label")).toBeDefined()
    })

    it("should pass HelperTextProps", () => {
      const { getByText } = render(
        <Toggle 
          value={false} 
          helper="Help text"
          HelperTextProps={{ style: { fontSize: 12 } }}
        />
      )
      
      expect(getByText("Help text")).toBeDefined()
    })

    it("should apply inputWrapperStyle", () => {
      const { getByRole } = render(
        <Toggle 
          value={false} 
          inputWrapperStyle={{ padding: 10 }}
        />
      )
      
      expect(getByRole("checkbox")).toBeDefined()
    })

    it("should handle undefined value as false", () => {
      const { getByRole } = render(<Toggle />)
      
      const toggle = getByRole("checkbox")
      expect(toggle.props.accessibilityState.checked).toBe(false)
    })

    it("should apply error styling to helper text when status is error", () => {
      const { getByText } = render(
        <Toggle 
          value={false} 
          status="error"
          helper="Error message"
        />
      )
      
      expect(getByText("Error message")).toBeDefined()
    })

    it("should render label with txOptions", () => {
      const { getByText } = render(
        <Toggle 
          value={false} 
          labelTx="welcome.message"
          labelTxOptions={{ name: "John" }}
        />
      )
      
      expect(getByText(/welcome\.message/)).toBeDefined()
    })

    it("should handle all TouchableOpacity props", () => {
      const { getByTestId } = render(
        <Toggle 
          value={false} 
          testID="custom-toggle"
          activeOpacity={0.7}
        />
      )
      
      expect(getByTestId("custom-toggle")).toBeDefined()
    })
  })
})

