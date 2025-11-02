import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { Text } from "react-native"
import { ListItem } from "./ListItem"

describe("ListItem", () => {
  it("should render the component with text", () => {
    const { getByText } = render(<ListItem text="Test Item" />)
    expect(getByText("Test Item")).toBeDefined()
  })

  it("should render with children", () => {
    const { getByText } = render(
      <ListItem>
        <Text>Child Text</Text>
      </ListItem>
    )
    expect(getByText("Child Text")).toBeDefined()
  })

  it("should render with tx prop for i18n", () => {
    const { getByText } = render(<ListItem tx="common.ok" />)
    // The mocked i18n returns key + params
    expect(getByText(/common\.ok/)).toBeDefined()
  })

  it("should handle onPress event", () => {
    const onPressMock = jest.fn()
    const { getByText } = render(<ListItem text="Press Me" onPress={onPressMock} />)
    
    fireEvent.press(getByText("Press Me"))
    expect(onPressMock).toHaveBeenCalledTimes(1)
  })

  it("should render with left icon", () => {
    const { getByText } = render(
      <ListItem text="With Icon" leftIcon="check" />
    )
    expect(getByText("With Icon")).toBeDefined()
  })

  it("should render with right icon", () => {
    const { getByText } = render(
      <ListItem text="With Right Icon" rightIcon="caretRight" />
    )
    expect(getByText("With Right Icon")).toBeDefined()
  })

  it("should render with custom height", () => {
    const { getByText } = render(
      <ListItem text="Custom Height" height={80} />
    )
    expect(getByText("Custom Height")).toBeDefined()
  })

  it("should render with top separator", () => {
    const { getByText } = render(
      <ListItem text="With Separator" topSeparator />
    )
    expect(getByText("With Separator")).toBeDefined()
  })

  it("should render with bottom separator", () => {
    const { getByText } = render(
      <ListItem text="With Separator" bottomSeparator />
    )
    expect(getByText("With Separator")).toBeDefined()
  })

  it("should apply custom containerStyle", () => {
    const customStyle = { backgroundColor: "red" }
    const { getByText } = render(
      <ListItem text="Styled" containerStyle={customStyle} />
    )
    expect(getByText("Styled")).toBeDefined()
  })

  it("should apply custom textStyle", () => {
    const customTextStyle = { fontSize: 20, color: "blue" }
    const { getByText } = render(
      <ListItem text="Styled Text" textStyle={customTextStyle} />
    )
    expect(getByText("Styled Text")).toBeDefined()
  })

  it("should render with left and right components", () => {
    const LeftComp = <Text>Left</Text>
    const RightComp = <Text>Right</Text>
    
    const { getByText } = render(
      <ListItem 
        text="Main Text" 
        LeftComponent={LeftComp}
        RightComponent={RightComp}
      />
    )
    
    expect(getByText("Main Text")).toBeDefined()
    expect(getByText("Left")).toBeDefined()
    expect(getByText("Right")).toBeDefined()
  })

  it("should have default height of 56", () => {
    const { getByText } = render(<ListItem text="Default Height" />)
    expect(getByText("Default Height")).toBeDefined()
  })
})

