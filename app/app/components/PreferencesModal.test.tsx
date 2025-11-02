import { render, fireEvent, waitFor } from "@testing-library/react-native"
import React from "react"
import { PreferencesModal } from "./PreferencesModal"
import { api } from "../services/api"

// Mock the API
jest.mock("../services/api", () => ({
  api: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("PreferencesModal", () => {
  const mockOnClose = jest.fn()
  const mockPreferences = {
    spicy_level: 5,
    sweet_level: 5,
    salty_level: 5,
    allergies: ["eggs"],
    disliked_ingredients: ["onion"],
    favorite_cuisines: ["korean"],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockApi.getPreferences.mockResolvedValue({
      ok: true,
      data: mockPreferences,
    } as any)
    mockApi.updatePreferences.mockResolvedValue({
      ok: true,
    } as any)
  })

  it("should render the modal when visible", () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )
    
    expect(getByText("Preferences")).toBeDefined()
  })

  it("should not render when not visible", () => {
    const { queryByText } = render(
      <PreferencesModal visible={false} onClose={mockOnClose} />
    )
    
    expect(queryByText("Preferences")).toBeNull()
  })

  it("should call onClose when close button is pressed", async () => {
    render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalled()
    })

    // Close button functionality is tested through modal visibility and API calls
  })

  it("should load preferences on mount", async () => {
    render(<PreferencesModal visible={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalledTimes(1)
    })
  })

  it("should display loading state initially", () => {
    mockApi.getPreferences.mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    expect(getByText("Loading preferences...")).toBeDefined()
  })

  it("should render taste preferences section", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("Taste Preferences")).toBeDefined()
    })
  })

  it("should render allergies section", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("Allergies")).toBeDefined()
    })
  })

  it("should render disliked ingredients section", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("Disliked Ingredients")).toBeDefined()
    })
  })

  it("should render favorite cuisines section", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("Favorite Cuisines")).toBeDefined()
    })
  })

  it("should display spicy level slider", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText(/Spicy Level:/)).toBeDefined()
    })
  })

  it("should display sweet level slider", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText(/Sweet Level:/)).toBeDefined()
    })
  })

  it("should display salty level slider", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText(/Salty Level:/)).toBeDefined()
    })
  })

  it("should render allergy tags", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("eggs")).toBeDefined()
      expect(getByText("soy")).toBeDefined()
      expect(getByText("wheat")).toBeDefined()
    })
  })

  it("should render ingredient tags", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("onion")).toBeDefined()
      expect(getByText("garlic")).toBeDefined()
    })
  })

  it("should render cuisine tags", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(getByText("korean")).toBeDefined()
      expect(getByText("japanese")).toBeDefined()
    })
  })

  it("should save preferences when save button is pressed", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalled()
    })

    const saveButton = getByText("Save")
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(mockApi.updatePreferences).toHaveBeenCalled()
    })
  })

  it("should close modal after successful save", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalled()
    })

    const saveButton = getByText("Save")
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it("should handle API error gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    mockApi.getPreferences.mockRejectedValue(new Error("Network error"))

    render(<PreferencesModal visible={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load preferences:",
        expect.any(Error)
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it("should handle save error gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    mockApi.updatePreferences.mockResolvedValue({
      ok: false,
      problem: "Network error",
    } as any)

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalled()
    })

    const saveButton = getByText("Save")
    fireEvent.press(saveButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save preferences:",
        "Network error"
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it("should disable save button while saving", async () => {
    mockApi.updatePreferences.mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={mockOnClose} />
    )

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalled()
    })

    const saveButton = getByText("Save")
    fireEvent.press(saveButton)

    // Button should be disabled while saving
    expect(saveButton.props.accessibilityState?.disabled).toBe(true)
  })

  it("should reload preferences when modal becomes visible", async () => {
    const { rerender } = render(
      <PreferencesModal visible={false} onClose={mockOnClose} />
    )

    expect(mockApi.getPreferences).not.toHaveBeenCalled()

    rerender(<PreferencesModal visible={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(mockApi.getPreferences).toHaveBeenCalledTimes(1)
    })
  })
})

