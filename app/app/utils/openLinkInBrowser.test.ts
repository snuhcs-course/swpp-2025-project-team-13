import { Linking } from "react-native"
import { openLinkInBrowser } from "./openLinkInBrowser"

describe("openLinkInBrowser", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations
    ;(Linking.canOpenURL as jest.Mock).mockResolvedValue(true)
    ;(Linking.openURL as jest.Mock).mockResolvedValue(undefined)
  })

  it("opens URL when canOpenURL returns true", async () => {
    ;(Linking.canOpenURL as jest.Mock).mockResolvedValue(true)

    openLinkInBrowser("https://example.com")

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(Linking.canOpenURL).toHaveBeenCalledWith("https://example.com")
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com")
  })

  it("does not open URL when canOpenURL returns false", async () => {
    ;(Linking.canOpenURL as jest.Mock).mockResolvedValue(false)

    openLinkInBrowser("invalid://url")

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(Linking.canOpenURL).toHaveBeenCalledWith("invalid://url")
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it("handles https URL with path", async () => {
    openLinkInBrowser("https://example.com/path")

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(Linking.canOpenURL).toHaveBeenCalledWith("https://example.com/path")
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com/path")
  })

  it("handles mailto URL", async () => {
    openLinkInBrowser("mailto:test@example.com")

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(Linking.canOpenURL).toHaveBeenCalledWith("mailto:test@example.com")
    expect(Linking.openURL).toHaveBeenCalledWith("mailto:test@example.com")
  })

  it("handles tel URL", async () => {
    openLinkInBrowser("tel:+1234567890")

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(Linking.canOpenURL).toHaveBeenCalledWith("tel:+1234567890")
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+1234567890")
  })
})
