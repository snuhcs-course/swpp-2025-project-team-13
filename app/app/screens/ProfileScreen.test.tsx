import React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react-native"
import { ProfileScreen } from "./ProfileScreen"

const mockReplace = jest.fn()
const navigation = { replace: mockReplace, navigate: jest.fn() }

const mockLogoutUser = jest.fn().mockResolvedValue({ success: true })

jest.mock("../models", () => ({
  useStores: () => ({ foodHistoryStore: { scrappedItemsList: [] } }),
}))

jest.mock("app/services/albums/useAlbumScanner", () => ({
  useAlbumScanner: () => ({ scanAlbums: jest.fn() }),
}))

jest.mock("app/services/registration", () => ({
  userAuthFacade: {
    loginUser: jest.fn(),
    registerUser: jest.fn(),
    logoutUser: (...args: any[]) => mockLogoutUser(...args),
  },
}))

jest.mock("app/services/api", () => ({
  api: {
    me: jest.fn(() => Promise.resolve({ ok: true, data: { username: "Sophia" } })),
    getUserPhotos: jest.fn(() => Promise.resolve([])),
    deleteImage: jest.fn(),
    updateImageLabel: jest.fn(),
  },
}))

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogoutUser.mockResolvedValue({ success: true })
  })

  it("renders username fetched from API", async () => {
    const { queryByText } = render(<ProfileScreen navigation={navigation} />)

    await waitFor(() => {
      expect(queryByText("Sophia")).toBeTruthy()
    })
  })

  it("logs out through facade and navigates to Welcome", async () => {
    const { getByTestId } = render(<ProfileScreen navigation={navigation} />)

    fireEvent.press(getByTestId("profile-logout-button"))

    await waitFor(() => {
      expect(mockLogoutUser).toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith("Welcome")
    })
  })
})
