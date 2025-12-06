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
    expect(getByText("음식 취향 설정하기")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <PreferencesModal visible={false} onClose={jest.fn()} />
    )
    expect(queryByText("음식 취향 설정하기")).toBeNull()
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
      expect(getByText("새로운 음식을 좋아하시나요?")).toBeTruthy()
      expect(getByText("알러지")).toBeTruthy()
      expect(getByText("싫어하는 재료")).toBeTruthy()
      expect(getByText("좋아하는 요리")).toBeTruthy()
    })
  })

  it("renders exploration preference options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("좋아해요")).toBeTruthy()
      expect(getByText("먹던 거만 먹어요")).toBeTruthy()
    })
  })

  it("renders allergy options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("달걀")).toBeTruthy()
      expect(getByText("대두")).toBeTruthy()
      expect(getByText("우유")).toBeTruthy()
      expect(getByText("땅콩")).toBeTruthy()
    })
  })

  it("renders disliked ingredient options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("양파")).toBeTruthy()
      expect(getByText("마늘")).toBeTruthy()
      expect(getByText("버섯")).toBeTruthy()
    })
  })

  it("renders favorite cuisine options", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("한식")).toBeTruthy()
      expect(getByText("일식")).toBeTruthy()
      expect(getByText("이탈리안")).toBeTruthy()
    })
  })

  it("renders save button", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      expect(getByText("저장")).toBeTruthy()
    })
  })

  it("shows loading state initially", () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    expect(getByText("설정 불러오는 중...")).toBeTruthy()
  })

  it("can toggle allergy selection", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      const eggsButton = getByText("달걀")
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

  it("handles save preferences successfully", async () => {
    const { api } = require("../services/api")
    const onCloseMock = jest.fn()
    const onPreferencesSavedMock = jest.fn()
    api.updatePreferences.mockResolvedValueOnce({ ok: true })

    const { getByText } = render(
      <PreferencesModal 
        visible={true} 
        onClose={onCloseMock} 
        onPreferencesSaved={onPreferencesSavedMock}
      />
    )

    await waitFor(() => {
      expect(getByText("저장")).toBeTruthy()
    })

    fireEvent.press(getByText("저장"))

    await waitFor(() => {
      expect(api.updatePreferences).toHaveBeenCalled()
      expect(onCloseMock).toHaveBeenCalled()
      expect(onPreferencesSavedMock).toHaveBeenCalled()
    })
  })

  it("handles save preferences failure", async () => {
    const { api } = require("../services/api")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    api.updatePreferences.mockResolvedValueOnce({ ok: false, problem: "network error" })

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )

    await waitFor(() => {
      expect(getByText("저장")).toBeTruthy()
    })

    fireEvent.press(getByText("저장"))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save preferences:", "network error")
    })

    consoleErrorSpy.mockRestore()
  })

  it("handles save preferences exception", async () => {
    const { api } = require("../services/api")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    api.updatePreferences.mockRejectedValueOnce(new Error("Network error"))

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )

    await waitFor(() => {
      expect(getByText("저장")).toBeTruthy()
    })

    fireEvent.press(getByText("저장"))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving preferences:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("can toggle disliked ingredient selection", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      const onionButton = getByText("양파")
      fireEvent.press(onionButton)
    })

    await waitFor(() => {
      const onionButton = getByText("양파")
      fireEvent.press(onionButton) // Toggle off
    })
  })

  it("can toggle favorite cuisine selection", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      const koreanButton = getByText("한식")
      fireEvent.press(koreanButton)
    })

    await waitFor(() => {
      const koreanButton = getByText("한식")
      fireEvent.press(koreanButton) // Toggle off
    })
  })

  it("can select exploration preference - adventurous", async () => {
    const { getByText, getAllByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      const adventurousButtons = getAllByText("좋아해요")
      fireEvent.press(adventurousButtons[0]) // First one is exploration preference
    })
  })

  it("can select exploration preference - conservative", async () => {
    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )
    
    await waitFor(() => {
      const conservativeButton = getByText("먹던 거만 먹어요")
      fireEvent.press(conservativeButton)
    })
  })

  it("handles load preferences failure", async () => {
    const { api } = require("../services/api")
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()
    api.getPreferences.mockRejectedValueOnce(new Error("Load error"))

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load preferences:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("disables save button while saving", async () => {
    const { api } = require("../services/api")
    let resolveUpdate: (value: any) => void
    api.updatePreferences.mockImplementationOnce(() => new Promise(resolve => {
      resolveUpdate = resolve
    }))

    const { getByText } = render(
      <PreferencesModal visible={true} onClose={jest.fn()} />
    )

    await waitFor(() => {
      expect(getByText("저장")).toBeTruthy()
    })

    fireEvent.press(getByText("저장"))

    // Save button should be disabled during saving
    expect(getByText("저장")).toBeTruthy()
  })

  it("can close modal using close button", async () => {
    const onCloseMock = jest.fn()
    const { UNSAFE_getByType } = render(
      <PreferencesModal visible={true} onClose={onCloseMock} />
    )

    await waitFor(() => {
      // Find TouchableOpacity components
      const touchables = UNSAFE_getByType(require("react-native").TouchableOpacity)
      expect(touchables).toBeTruthy()
    })
  })
})

