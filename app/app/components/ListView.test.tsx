import { render } from "@testing-library/react-native"
import React from "react"
import { Text } from "react-native"
import { ListView } from "./ListView"

// Mock @shopify/flash-list
jest.mock("@shopify/flash-list", () => {
  const { FlatList } = require("react-native")
  return {
    FlashList: FlatList,
  }
})

describe("ListView", () => {
  const mockData = [
    { id: "1", text: "Item 1" },
    { id: "2", text: "Item 2" },
    { id: "3", text: "Item 3" },
  ]

  const renderItem = ({ item }: { item: { id: string; text: string } }) => (
    <Text>{item.text}</Text>
  )

  it("renders without crashing", () => {
    const { toJSON } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("renders list items", () => {
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
      />
    )
    expect(getByText("Item 1")).toBeTruthy()
    expect(getByText("Item 2")).toBeTruthy()
    expect(getByText("Item 3")).toBeTruthy()
  })

  it("renders empty list", () => {
    const { toJSON } = render(
      <ListView
        data={[]}
        renderItem={renderItem}
        estimatedItemSize={50}
      />
    )
    expect(toJSON()).toBeTruthy()
  })

  it("applies estimatedItemSize prop", () => {
    const { toJSON } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={100}
      />
    )
    expect(toJSON()).toBeTruthy()
  })
})

