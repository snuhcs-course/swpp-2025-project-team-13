import { render, fireEvent, waitFor } from "@testing-library/react-native"
import React from "react"
import { SettingsModal } from "./SettingsModal"
import * as Location from "expo-location"
import * as MediaLibrary from "expo-media-library"
import * as storage from "app/utils/storage"

// Mock expo-location
const mockGetForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted" })
const mockRequestForegroundPermissionsAsync = jest.fn().mockResolvedValue({ status: "granted" })

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: (...args: any[]) => mockGetForegroundPermissionsAsync(...args),
  requestForegroundPermissionsAsync: (...args: any[]) => mockRequestForegroundPermissionsAsync(...args),
}))

// Mock expo-media-library
const mockRequestGalleryPermission = jest.fn().mockResolvedValue({ status: "granted" })
const mockGalleryPermissionResponse = { status: "granted" }

jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn().mockReturnValue([
    mockGalleryPermissionResponse,
    mockRequestGalleryPermission,
  ]),
}))

// Mock storage
const mockLoadString = jest.fn().mockResolvedValue(null)
const mockSaveString = jest.fn().mockResolvedValue(undefined)

jest.mock("app/utils/storage", () => ({
  loadString: (...args: any[]) => mockLoadString(...args),
  saveString: (...args: any[]) => mockSaveString(...args),
}))

// Mock the child modals
jest.mock("./index", () => ({
  LocationWarningModal: ({ visible, onCancel, onConfirm }: any) => {
    if (!visible) return null
    const { View, Text, TouchableOpacity } = require("react-native")
    return (
      <View testID="location-warning-modal">
        <Text>LocationWarningModal</Text>
        <TouchableOpacity testID="location-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="location-confirm" onPress={onConfirm}>
          <Text>Confirm</Text>
        </TouchableOpacity>
      </View>
    )
  },
  StorageWarningModal: ({ visible, onCancel, onConfirm }: any) => {
    if (!visible) return null
    const { View, Text, TouchableOpacity } = require("react-native")
    return (
      <View testID="storage-warning-modal">
        <Text>StorageWarningModal</Text>
        <TouchableOpacity testID="storage-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="storage-confirm" onPress={onConfirm}>
          <Text>Confirm</Text>
        </TouchableOpacity>
      </View>
    )
  },
}))

describe("SettingsModal", () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onLogout: jest.fn(),
    onDeleteAccount: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mocks to default behavior
    mockLoadString.mockResolvedValue(null)
    mockSaveString.mockResolvedValue(undefined)
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "granted" })
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" })
    mockRequestGalleryPermission.mockResolvedValue({ status: "granted" })
    mockGalleryPermissionResponse.status = "granted"
    
    // Reset MediaLibrary.usePermissions mock to default
    ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
      mockGalleryPermissionResponse,
      mockRequestGalleryPermission,
    ])
  })

  it("renders correctly when visible", () => {
    const { getByText } = render(<SettingsModal {...defaultProps} />)
    expect(getByText("설정")).toBeTruthy()
    expect(getByText("위치 서비스")).toBeTruthy()
    expect(getByText("갤러리 접근")).toBeTruthy()
    expect(getByText("로그아웃")).toBeTruthy()
    expect(getByText("탈퇴하기")).toBeTruthy()
  })

  it("does not render when not visible", () => {
    const { queryByText } = render(
      <SettingsModal {...defaultProps} visible={false} />
    )
    expect(queryByText("설정")).toBeNull()
  })

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = render(
      <SettingsModal {...defaultProps} onClose={onClose} />
    )
    const touchables = UNSAFE_getAllByType(require("react-native").TouchableOpacity)
    fireEvent.press(touchables[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onLogout when logout button is pressed", () => {
    const onLogout = jest.fn()
    const { getByText } = render(
      <SettingsModal {...defaultProps} onLogout={onLogout} />
    )
    fireEvent.press(getByText("로그아웃"))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it("calls onDeleteAccount when delete button is pressed", () => {
    const onDeleteAccount = jest.fn()
    const { getByText } = render(
      <SettingsModal {...defaultProps} onDeleteAccount={onDeleteAccount} />
    )
    fireEvent.press(getByText("탈퇴하기"))
    expect(onDeleteAccount).toHaveBeenCalledTimes(1)
  })

  it("renders location and storage toggle switches", () => {
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    expect(switches.length).toBe(2)
  })

  it("displays descriptions for settings", () => {
    const { getByText } = render(<SettingsModal {...defaultProps} />)
    expect(getByText("위치 기반 음식 추천")).toBeTruthy()
    expect(getByText("음식 사진 기반 맞춤 추천")).toBeTruthy()
  })

  it("checks permissions when modal becomes visible", async () => {
    mockLoadString.mockResolvedValue("true")
    
    const { rerender } = render(<SettingsModal {...defaultProps} visible={false} />)
    
    expect(mockLoadString).not.toHaveBeenCalled()
    
    rerender(<SettingsModal {...defaultProps} visible={true} />)
    
    await waitFor(() => {
      expect(mockLoadString).toHaveBeenCalledWith("LOCATION_PERMISSION_GRANTED")
      expect(mockLoadString).toHaveBeenCalledWith("GALLERY_PERMISSION_GRANTED")
      expect(mockGetForegroundPermissionsAsync).toHaveBeenCalled()
    })
  })

  it("uses stored onboarding state for location permission", async () => {
    mockLoadString.mockImplementation((key: string) => {
      if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true")
      if (key === "USE_DUMMY_LOCATION") return Promise.resolve(null)
      return Promise.resolve(null)
    })
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches[0].props.value).toBe(true)
    })
  })

  it("disables location toggle when user chose dummy location", async () => {
    mockLoadString.mockImplementation((key: string) => {
      if (key === "LOCATION_PERMISSION_GRANTED") return Promise.resolve("true")
      if (key === "USE_DUMMY_LOCATION") return Promise.resolve("true")
      return Promise.resolve(null)
    })
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches[0].props.value).toBe(false)
    })
  })

  it("uses stored onboarding state for storage permission", async () => {
    mockLoadString.mockImplementation((key: string) => {
      if (key === "GALLERY_PERMISSION_GRANTED") return Promise.resolve("true")
      if (key === "USE_DUMMY_STORAGE") return Promise.resolve(null)
      return Promise.resolve(null)
    })
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches[1].props.value).toBe(true)
    })
  })

  it("disables storage toggle when user chose dummy storage", async () => {
    mockLoadString.mockImplementation((key: string) => {
      if (key === "GALLERY_PERMISSION_GRANTED") return Promise.resolve("true")
      if (key === "USE_DUMMY_STORAGE") return Promise.resolve("true")
      return Promise.resolve(null)
    })
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches[1].props.value).toBe(false)
    })
  })

  it("renders switches for location and storage permissions", async () => {
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
  })

  it("calls storage functions when needed", async () => {
    mockLoadString.mockResolvedValue("true")
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockLoadString).toHaveBeenCalled()
    })
  })

  it("enables location when toggle is turned on", async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: "granted" })
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[0], "onValueChange", true)
    
    await waitFor(() => {
      expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled()
      expect(mockSaveString).toHaveBeenCalledWith("LOCATION_PERMISSION_GRANTED", "true")
      expect(mockSaveString).toHaveBeenCalledWith("USE_DUMMY_LOCATION", "false")
    })
  })

  it("shows location warning modal when toggle is turned off", async () => {
    const { UNSAFE_getAllByType, getByTestId } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[0], "onValueChange", false)
    
    await waitFor(() => {
      expect(getByTestId("location-warning-modal")).toBeTruthy()
    })
  })

  it("confirms location warning and disables location", async () => {
    const { UNSAFE_getAllByType, getByTestId } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[0], "onValueChange", false)
    
    await waitFor(() => {
      expect(getByTestId("location-warning-modal")).toBeTruthy()
    })
    
    fireEvent.press(getByTestId("location-confirm"))
    
    await waitFor(() => {
      expect(mockSaveString).toHaveBeenCalledWith("LOCATION_PERMISSION_GRANTED", "false")
      expect(mockSaveString).toHaveBeenCalledWith("USE_DUMMY_LOCATION", "true")
    })
  })

  it("cancels location warning and keeps location enabled", async () => {
    const { UNSAFE_getAllByType, getByTestId, queryByTestId } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[0], "onValueChange", false)
    
    await waitFor(() => {
      expect(getByTestId("location-warning-modal")).toBeTruthy()
    })
    
    fireEvent.press(getByTestId("location-cancel"))
    
    await waitFor(() => {
      expect(queryByTestId("location-warning-modal")).toBeNull()
    })
  })

  it("enables storage when toggle is turned on", async () => {
    // Create a properly functioning mock
    const mockRequest = jest.fn().mockResolvedValue({ status: "granted" })
    ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
      { status: "undetermined" },
      mockRequest,
    ])
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[1], "onValueChange", true)
    
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled()
      expect(mockSaveString).toHaveBeenCalledWith("GALLERY_PERMISSION_GRANTED", "true")
      expect(mockSaveString).toHaveBeenCalledWith("USE_DUMMY_STORAGE", "false")
    })
  })

  it("shows storage warning modal when toggle is turned off", async () => {
    const { UNSAFE_getAllByType, getByTestId } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[1], "onValueChange", false)
    
    await waitFor(() => {
      expect(getByTestId("storage-warning-modal")).toBeTruthy()
    })
  })

  it("confirms storage warning and disables storage", async () => {
    const { UNSAFE_getAllByType, getByTestId } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[1], "onValueChange", false)
    
    await waitFor(() => {
      expect(getByTestId("storage-warning-modal")).toBeTruthy()
    })
    
    fireEvent.press(getByTestId("storage-confirm"))
    
    await waitFor(() => {
      expect(mockSaveString).toHaveBeenCalledWith("GALLERY_PERMISSION_GRANTED", "false")
      expect(mockSaveString).toHaveBeenCalledWith("USE_DUMMY_STORAGE", "true")
    })
  })

  it("cancels storage warning and keeps storage enabled", async () => {
    const { UNSAFE_getAllByType, getByTestId, queryByTestId } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[1], "onValueChange", false)
    
    await waitFor(() => {
      expect(getByTestId("storage-warning-modal")).toBeTruthy()
    })
    
    fireEvent.press(getByTestId("storage-cancel"))
    
    await waitFor(() => {
      expect(queryByTestId("storage-warning-modal")).toBeNull()
    })
  })

  it("handles checkPermissions error gracefully", async () => {
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()
    mockLoadString.mockRejectedValueOnce(new Error("Storage error"))
    
    render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith("Error checking permissions:", expect.any(Error))
    })
    
    consoleLogSpy.mockRestore()
  })

  it("handles location permission denied", async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValueOnce({ status: "denied" })
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[0], "onValueChange", true)
    
    await waitFor(() => {
      expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalled()
      expect(mockSaveString).toHaveBeenCalledWith("LOCATION_PERMISSION_GRANTED", "false")
    })
  })

  it("handles storage permission denied", async () => {
    const mockRequest = jest.fn().mockResolvedValue({ status: "denied" })
    ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
      { status: "undetermined" },
      mockRequest,
    ])
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      expect(switches.length).toBe(2)
    })
    
    const switches = UNSAFE_getAllByType(require("react-native").Switch)
    fireEvent(switches[1], "onValueChange", true)
    
    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled()
      expect(mockSaveString).toHaveBeenCalledWith("GALLERY_PERMISSION_GRANTED", "false")
    })
  })

  it("uses system permissions when no stored state", async () => {
    mockLoadString.mockResolvedValue(null)
    mockGetForegroundPermissionsAsync.mockResolvedValue({ status: "granted" })
    ;(MediaLibrary.usePermissions as jest.Mock).mockReturnValue([
      { status: "granted", granted: true },
      mockRequestGalleryPermission,
    ])
    
    const { UNSAFE_getAllByType } = render(<SettingsModal {...defaultProps} />)
    
    await waitFor(() => {
      const switches = UNSAFE_getAllByType(require("react-native").Switch)
      // Both should be true when system permissions are granted and no stored state
      expect(switches[0].props.value).toBe(true)
      expect(switches[1].props.value).toBe(true)
    })
  })
})