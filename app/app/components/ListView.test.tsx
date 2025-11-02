import { render } from "@testing-library/react-native"
import React from "react"
import { ListView } from "./ListView"
import { Text } from "react-native"

describe("ListView", () => {
  const mockData = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ]

  const renderItem = ({ item }: { item: { id: string; name: string } }) => (
    <Text>{item.name}</Text>
  )

  it("should render the component with data", () => {
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
        keyExtractor={(item) => item.id}
      />
    )
    
    expect(getByText("Item 1")).toBeDefined()
  })

  it("should render empty list", () => {
    const { queryByText } = render(
      <ListView
        data={[]}
        renderItem={renderItem}
        estimatedItemSize={50}
      />
    )
    
    expect(queryByText("Item 1")).toBeNull()
  })

  it("should use keyExtractor properly", () => {
    const keyExtractor = jest.fn((item) => item.id)
    
    render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
        keyExtractor={keyExtractor}
      />
    )
    
    // KeyExtractor should be called for each item
    expect(keyExtractor).toHaveBeenCalled()
  })

  it("should handle estimatedItemSize prop", () => {
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={100}
        keyExtractor={(item) => item.id}
      />
    )
    
    expect(getByText("Item 1")).toBeDefined()
  })

  it("should render ListHeaderComponent", () => {
    const ListHeader = () => <Text>Header</Text>
    
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
        ListHeaderComponent={ListHeader}
      />
    )
    
    expect(getByText("Header")).toBeDefined()
  })

  it("should render ListFooterComponent", () => {
    const ListFooter = () => <Text>Footer</Text>
    
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
        ListFooterComponent={ListFooter}
      />
    )
    
    expect(getByText("Footer")).toBeDefined()
  })

  it("should render ListEmptyComponent when data is empty", () => {
    const EmptyComponent = () => <Text>No Items</Text>
    
    const { getByText } = render(
      <ListView
        data={[]}
        renderItem={renderItem}
        estimatedItemSize={50}
        ListEmptyComponent={EmptyComponent}
      />
    )
    
    expect(getByText("No Items")).toBeDefined()
  })

  it("should handle horizontal orientation", () => {
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
        horizontal
      />
    )
    
    expect(getByText("Item 1")).toBeDefined()
  })

  it("should handle contentContainerStyle", () => {
    const customStyle = { padding: 20 }
    
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
        contentContainerStyle={customStyle}
      />
    )
    
    expect(getByText("Item 1")).toBeDefined()
  })

  it("should use FlashList for LTR languages", () => {
    // isRTL is false by default in test environment
    const { getByText } = render(
      <ListView
        data={mockData}
        renderItem={renderItem}
        estimatedItemSize={50}
      />
    )
    
    expect(getByText("Item 1")).toBeDefined()
  })
})

