import { render, fireEvent } from "@testing-library/react-native"
import React from "react"
import { View } from "react-native"
import { ListItem } from "./ListItem"

describe("ListItem", () => {
  it("renders with text", () => {
    const { getByText } = render(<ListItem text="Test Item" />)
    expect(getByText("Test Item")).toBeTruthy()
  })

  it("renders without crashing", () => {
    const { toJSON } = render(<ListItem />)
    expect(toJSON()).toBeTruthy()
  })

  it("calls onPress when pressed", () => {
    const onPressMock = jest.fn()
    const { getByText } = render(<ListItem text="Pressable" onPress={onPressMock} />)
    fireEvent.press(getByText("Pressable"))
    expect(onPressMock).toHaveBeenCalledTimes(1)
  })

  it("renders with left icon", () => {
    const { toJSON } = render(<ListItem text="With Icon" leftIcon="check" />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders with right icon", () => {
    const { toJSON } = render(<ListItem text="With Icon" rightIcon="caretRight" />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders with both icons", () => {
    const { toJSON } = render(
      <ListItem text="Both Icons" leftIcon="check" rightIcon="caretRight" />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with custom LeftComponent", () => {
    const { getByTestId } = render(
      <ListItem 
        text="Custom Left"
        LeftComponent={<View testID="left-custom" />}
      />
    )
    expect(getByTestId("left-custom")).toBeTruthy()
  })

  it("renders with custom RightComponent", () => {
    const { getByTestId } = render(
      <ListItem 
        text="Custom Right"
        RightComponent={<View testID="right-custom" />}
      />
    )
    expect(getByTestId("right-custom")).toBeTruthy()
  })

  it("applies custom height", () => {
    const { toJSON } = render(<ListItem text="Tall Item" height={80} />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders with top separator", () => {
    const { toJSON } = render(<ListItem text="Top Sep" topSeparator />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders with bottom separator", () => {
    const { toJSON } = render(<ListItem text="Bottom Sep" bottomSeparator />)
    expect(toJSON()).toBeTruthy()
  })

  it("renders with both separators", () => {
    const { toJSON } = render(
      <ListItem text="Both Seps" topSeparator bottomSeparator />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom textStyle", () => {
    const { toJSON } = render(
      <ListItem text="Styled" textStyle={{ color: "red" }} />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies custom containerStyle", () => {
    const { toJSON } = render(
      <ListItem text="Container" containerStyle={{ padding: 20 }} />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with leftIconColor", () => {
    const { toJSON } = render(
      <ListItem text="Colored Icon" leftIcon="check" leftIconColor="#ff0000" />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders with rightIconColor", () => {
    const { toJSON } = render(
      <ListItem text="Colored Icon" rightIcon="caretRight" rightIconColor="#00ff00" />
    )
    expect(toJSON()).toBeTruthy()
  })
})
