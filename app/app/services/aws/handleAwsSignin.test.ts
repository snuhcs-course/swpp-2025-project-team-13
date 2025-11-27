import { handleSignIn, handleSignOut } from "./handleAwsSignin"

// Mock AWS Amplify auth
const mockSignIn = jest.fn()
const mockSignOut = jest.fn()

jest.mock("aws-amplify/auth", () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
}))

// Mock console.log
const consoleLogSpy = jest.spyOn(console, "log").mockImplementation()

describe("handleAwsSignin", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("handleSignIn", () => {
    it("successfully signs in user", async () => {
      mockSignIn.mockResolvedValue({
        isSignedIn: true,
        nextStep: {},
      })

      await handleSignIn("testuser", "password123")

      expect(mockSignIn).toHaveBeenCalledWith({
        username: "testuser",
        password: "password123",
      })
      expect(consoleLogSpy).toHaveBeenCalledWith("User signed in successfully")
    })

    it("handles sign in requiring additional steps", async () => {
      mockSignIn.mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_UP" },
      })

      await handleSignIn("testuser", "password123")

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Sign-in requires additional steps that are not handled:",
        { signInStep: "CONFIRM_SIGN_UP" }
      )
    })

    it("handles sign in error", async () => {
      const error = new Error("Invalid credentials")
      mockSignIn.mockRejectedValue(error)

      await handleSignIn("testuser", "wrongpassword")

      expect(consoleLogSpy).toHaveBeenCalledWith("error signing in", error)
    })

    it("handles network error", async () => {
      const networkError = new Error("Network request failed")
      mockSignIn.mockRejectedValue(networkError)

      await handleSignIn("testuser", "password123")

      expect(consoleLogSpy).toHaveBeenCalledWith("error signing in", networkError)
    })
  })

  describe("handleSignOut", () => {
    it("successfully signs out user", async () => {
      mockSignOut.mockResolvedValue(undefined)

      await handleSignOut()

      expect(mockSignOut).toHaveBeenCalled()
    })

    it("handles sign out error", async () => {
      const error = new Error("Sign out failed")
      mockSignOut.mockRejectedValue(error)

      await handleSignOut()

      expect(consoleLogSpy).toHaveBeenCalledWith("error signing out: ", error)
    })
  })
})

