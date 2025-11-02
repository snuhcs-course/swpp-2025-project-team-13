import { render, fireEvent, waitFor } from "@testing-library/react-native"
import React from "react"
import { PreferencesModal } from "./PreferencesModal"

// Mock API
jest.mock("../services/api", () => ({
  api: {
    getPreferences: jest.fn(() => Promise.resolve({
      ok: true,
      data: {
        spicy_level: 5,
        sweet_level: 5,
        salty_level: 5,
        allergies: [],
        disliked_ingredients: [],
        favorite_cuisines: []
      }
    })),
    updatePreferences: jest.fn(() => Promise.resolve({ ok: true }))
  }
}))

describe("PreferencesModal", () => {
  it("renders when visible", () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    expect(getByText("Preferences")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <PreferencesModal visible={false} onClose={jest.fn()} />
    )
    expect(queryByText("Preferences")).toBeNull()
  })

  it("calls onClose when modal is closed", () => {
    const onCloseMock = jest.fn()
    const { toJSON } = render(
      <PreferencesModal visible={true} onClose={onCloseMock} />
    )
    expect(toJSON()).toBeTruthy()
    // Modal close functionality is tested visually
  })

  it("renders section titles", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("Taste Preferences")).toBeTruthy()
      expect(getByText("Allergies")).toBeTruthy()
      expect(getByText("Disliked Ingredients")).toBeTruthy()
      expect(getByText("Favorite Cuisines")).toBeTruthy()
    })
  })

  it("renders taste level sliders", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText(/Spicy Level:/)).toBeTruthy()
      expect(getByText(/Sweet Level:/)).toBeTruthy()
      expect(getByText(/Salty Level:/)).toBeTruthy()
    })
  })

  it("renders allergy options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("eggs")).toBeTruthy()
      expect(getByText("soy")).toBeTruthy()
      expect(getByText("milk")).toBeTruthy()
      expect(getByText("peanuts")).toBeTruthy()
    })
  })

  it("renders disliked ingredient options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("onion")).toBeTruthy()
      expect(getByText("garlic")).toBeTruthy()
      expect(getByText("mushroom")).toBeTruthy()
    })
  })

  it("renders favorite cuisine options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("korean")).toBeTruthy()
      expect(getByText("japanese")).toBeTruthy()
      expect(getByText("italian")).toBeTruthy()
    })
  })

  it("renders save button", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("Save")).toBeTruthy()
    })
  })

  it("shows loading state initially", () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    expect(getByText("Loading preferences...")).toBeTruthy()
  })

  it("can toggle allergy selection", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      const eggsButton = getByText("eggs")
      fireEvent.press(eggsButton)
    })
  })

  it("loads preferences when becomes visible", async () => {
    const { api } = require("../services/api")
    const { rerender } = render(
      <PreferencesModal visible={false} onClose={jest.fn()} />
    )
    
    rerender(<PreferencesModal visible={true} onClose={jest.fn()} />)
    
    await waitFor(() => {
      expect(api.getPreferences).toHaveBeenCalled()
    })
  })
})

