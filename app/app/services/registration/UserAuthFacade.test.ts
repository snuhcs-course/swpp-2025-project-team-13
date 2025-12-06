import { UserAuthFacade } from "./UserAuthFacade"

// Mock aws-amplify/auth 
jest.mock("aws-amplify/auth", () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  deleteUser: jest.fn(),
  getCurrentUser: jest.fn().mockResolvedValue({ username: "tester", userId: "123" }),
  confirmSignUp: jest.fn(),
}))

const defaultRegistrationRequest = {
  username: "tester",
  email: "tester@example.com",
  password: "supersafe!",
}

const defaultLoginRequest = {
  username: "tester",
  password: "supersafe!",
}

const mockApi = () => ({
  getCsrf: jest.fn().mockResolvedValue(undefined),
  register: jest.fn().mockResolvedValue({ ok: true, data: {} }),
  login: jest.fn().mockResolvedValue({ ok: true, data: {} }),
  logout: jest.fn().mockResolvedValue({ ok: true }),
  getPreferences: jest.fn().mockResolvedValue({ ok: true, data: { spicy_level: 3 } }),
})

const mockStorage = () => ({
  saveString: jest.fn().mockResolvedValue(true),
  remove: jest.fn().mockResolvedValue(undefined),
})

const mockCognitoSignUp = () => jest.fn().mockResolvedValue({ isSignUpComplete: true })
const mockCognitoSignIn = () => jest.fn().mockResolvedValue({ isSignedIn: true })
const mockCognitoSignOut = () => jest.fn().mockResolvedValue(undefined)

const mockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
})

const buildFacade = (
  overrides: Partial<ConstructorParameters<typeof UserAuthFacade>[0]> = {},
) => {
  const apiClient = overrides.apiClient ?? mockApi()
  const storagePort = overrides.storagePort ?? mockStorage()
  const cognitoSignUp = overrides.cognitoSignUp ?? mockCognitoSignUp()
  const cognitoSignIn = overrides.cognitoSignIn ?? mockCognitoSignIn()
  const cognitoSignOut = overrides.cognitoSignOut ?? mockCognitoSignOut()
  const logger = overrides.logger ?? mockLogger()

  const facade = new UserAuthFacade({
    apiClient,
    storagePort,
    cognitoSignUp,
    cognitoSignIn,
    cognitoSignOut,
    logger,
  })

  return { facade, apiClient, storagePort, cognitoSignUp, cognitoSignIn, cognitoSignOut, logger }
}

describe("UserAuthFacade", () => {
  it("completes registration when all steps succeed", async () => {
    const { facade, apiClient, storagePort, cognitoSignUp } = buildFacade()

    const result = await facade.registerUser(defaultRegistrationRequest)

    expect(result).toEqual({ success: true })
    expect(apiClient.getCsrf).toHaveBeenCalled()
    expect(apiClient.register).toHaveBeenCalledWith(
      defaultRegistrationRequest.username,
      defaultRegistrationRequest.email,
      defaultRegistrationRequest.password,
    )
    expect(cognitoSignUp).toHaveBeenCalled()
    expect(storagePort.saveString).toHaveBeenCalledWith("IS_LOGGED_IN", "true")
  })

  it("returns a helpful error when backend registration fails", async () => {
    const { facade, apiClient, storagePort, cognitoSignUp } = buildFacade({
      apiClient: {
        ...mockApi(),
        register: jest.fn().mockResolvedValue({
          ok: false,
          data: { detail: "아이디가 이미 존재합니다." },
        }),
      },
    })

    const result = await facade.registerUser(defaultRegistrationRequest)

    expect(result).toEqual({ success: false, errorMessage: "아이디가 이미 존재합니다." })
    expect(cognitoSignUp).not.toHaveBeenCalled()
    expect(storagePort.saveString).not.toHaveBeenCalled()
    expect(apiClient.register).toHaveBeenCalled()
  })

  it("handles AWS sign-up failures gracefully", async () => {
    const failingCognito = jest.fn().mockResolvedValue({
      isSignUpComplete: false,
      nextStep: { signUpStep: "CONFIRM_SIGN_UP" },
    })
    const { facade, storagePort } = buildFacade({ cognitoSignUp: failingCognito })

    const result = await facade.registerUser(defaultRegistrationRequest)

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe("AWS 회원가입 도중 문제가 발생했습니다.")
    expect(storagePort.saveString).not.toHaveBeenCalled()
  })

  it("logs in user and reports preferences presence", async () => {
    const api = mockApi()
    const cognito = mockCognitoSignIn()
    const { facade, apiClient, storagePort, cognitoSignIn } = buildFacade({
      apiClient: api,
      cognitoSignIn: cognito,
    })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: true, hasPreferences: true })
    expect(api.login).toHaveBeenCalledWith(
      defaultLoginRequest.username,
      defaultLoginRequest.password,
    )
    expect(cognito).toHaveBeenCalled()
    expect(storagePort.saveString).toHaveBeenCalledWith("IS_LOGGED_IN", "true")
  })

  it("navigates users without preferences to onboarding", async () => {
    const api = mockApi()
    api.getPreferences = jest.fn().mockResolvedValue({ ok: false })
    const cognito = mockCognitoSignIn()
    
    const { facade } = buildFacade({
      apiClient: api,
      cognitoSignIn: cognito,
    })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: true, hasPreferences: false })
  })

  it("returns error when backend login fails", async () => {
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        login: jest.fn().mockResolvedValue({ ok: false, data: { detail: "Invalid credentials" } }),
      },
    })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: false, errorMessage: "Invalid credentials" })
  })

  it("reports AWS login failures", async () => {
    const failingSignIn = jest.fn().mockResolvedValue({ isSignedIn: false })
    const { facade } = buildFacade({ cognitoSignIn: failingSignIn })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe("AWS 로그인 도중 문제가 발생했습니다.")
  })

  it("logs out users even when backend logout fails", async () => {
    const { facade, apiClient, storagePort, cognitoSignOut } = buildFacade({
      apiClient: {
        ...mockApi(),
        logout: jest.fn().mockRejectedValue(new Error("network")),
      },
    })

    const result = await facade.logoutUser()

    expect(result).toEqual({ success: true })
    expect(apiClient.getCsrf).toHaveBeenCalled()
    expect(apiClient.logout).toHaveBeenCalled()
    expect(cognitoSignOut).toHaveBeenCalled()
    expect(storagePort.remove).toHaveBeenCalledWith("IS_LOGGED_IN")
  })

  it("handles registration CSRF failure", async () => {
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        getCsrf: jest.fn().mockRejectedValue(new Error("CSRF error")),
      },
    })

    const result = await facade.registerUser(defaultRegistrationRequest)

    expect(result).toEqual({ success: false, errorMessage: "보안 토큰을 가져오지 못했습니다." })
  })

  it("handles login CSRF failure", async () => {
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        getCsrf: jest.fn().mockRejectedValue(new Error("CSRF error")),
      },
    })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: false, errorMessage: "보안 토큰을 가져오지 못했습니다." })
  })

  it("handles logout CSRF failure gracefully", async () => {
    const { facade, cognitoSignOut, storagePort } = buildFacade({
      apiClient: {
        ...mockApi(),
        getCsrf: jest.fn().mockRejectedValue(new Error("CSRF error")),
      },
    })

    const result = await facade.logoutUser()

    expect(result).toEqual({ success: true })
    expect(cognitoSignOut).toHaveBeenCalled()
    expect(storagePort.remove).toHaveBeenCalled()
  })

  it("handles logout cognito signout failure gracefully", async () => {
    const { facade, storagePort } = buildFacade({
      cognitoSignOut: jest.fn().mockRejectedValue(new Error("Cognito error")),
    })

    const result = await facade.logoutUser()

    expect(result).toEqual({ success: true })
    expect(storagePort.remove).toHaveBeenCalledWith("IS_LOGGED_IN")
  })

  it("checks authentication status when user is authenticated", async () => {
    const { getCurrentUser } = require("aws-amplify/auth")
    getCurrentUser.mockResolvedValueOnce({ username: "testuser", userId: "123" })
    
    const { facade } = buildFacade()

    const result = await facade.checkAuthenticationStatus()

    expect(result).toEqual({ isAuthenticated: true, username: "testuser" })
  })

  it("checks authentication status when user is not authenticated", async () => {
    const { getCurrentUser } = require("aws-amplify/auth")
    getCurrentUser.mockRejectedValueOnce(new Error("Not authenticated"))
    
    const { facade } = buildFacade()

    const result = await facade.checkAuthenticationStatus()

    expect(result).toEqual({ isAuthenticated: false })
  })

  it("deletes user account successfully", async () => {
    const { deleteUser } = require("aws-amplify/auth")
    deleteUser.mockResolvedValueOnce(undefined)
    
    const { facade, storagePort } = buildFacade()

    const result = await facade.deleteUserAccount()

    expect(result).toEqual({ success: true })
    expect(deleteUser).toHaveBeenCalled()
    expect(storagePort.remove).toHaveBeenCalledWith("IS_LOGGED_IN")
    expect(storagePort.remove).toHaveBeenCalledWith("NEW_USER")
  })

  it("handles delete account failure", async () => {
    const { deleteUser } = require("aws-amplify/auth")
    deleteUser.mockRejectedValueOnce(new Error("Delete failed"))
    
    const { facade } = buildFacade()

    const result = await facade.deleteUserAccount()

    expect(result).toEqual({ 
      success: false, 
      errorMessage: "AWS 계정 삭제 중 문제가 발생했습니다." 
    })
  })

  it("handles registration with sign-in failure but continues", async () => {
    const failingSignIn = jest.fn().mockRejectedValue(new Error("Sign-in failed"))
    const { facade, storagePort } = buildFacade({ 
      cognitoSignIn: failingSignIn,
    })

    const result = await facade.registerUser(defaultRegistrationRequest)

    expect(result).toEqual({ success: true })
    expect(storagePort.saveString).toHaveBeenCalledWith("IS_LOGGED_IN", "true")
    expect(storagePort.saveString).toHaveBeenCalledWith("NEW_USER", "true")
  })

  it("handles registration with getCurrentUser verification failure", async () => {
    const { getCurrentUser } = require("aws-amplify/auth")
    const originalGetCurrentUser = getCurrentUser
    getCurrentUser.mockRejectedValueOnce(new Error("Verification failed"))
    
    const { facade, storagePort } = buildFacade()

    const result = await facade.registerUser(defaultRegistrationRequest)

    // Registration should still succeed despite verification failure
    expect(result).toEqual({ success: true })
    expect(storagePort.saveString).toHaveBeenCalledWith("IS_LOGGED_IN", "true")
    
    // Restore original mock
    getCurrentUser.mockImplementation(originalGetCurrentUser)
  })

  it("handles login with getCurrentUser verification failure", async () => {
    const { getCurrentUser } = require("aws-amplify/auth")
    getCurrentUser.mockRejectedValueOnce(new Error("Verification failed"))
    
    const { facade } = buildFacade()

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ 
      success: false, 
      errorMessage: "AWS 로그인 도중 문제가 발생했습니다." 
    })
  })

  it("handles login preferences check failure gracefully", async () => {
    const { getCurrentUser } = require("aws-amplify/auth")
    getCurrentUser.mockResolvedValue({ username: "tester", userId: "123" })
    
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        getPreferences: jest.fn().mockRejectedValue(new Error("Preferences error")),
      },
    })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: true, hasPreferences: false })
  })

  it("stores credentials during registration", async () => {
    const { facade, storagePort } = buildFacade()

    await facade.registerUser(defaultRegistrationRequest)

    expect(storagePort.saveString).toHaveBeenCalledWith("STORED_USERNAME", defaultRegistrationRequest.username)
    expect(storagePort.saveString).toHaveBeenCalledWith("STORED_PASSWORD", defaultRegistrationRequest.password)
  })

  it("stores credentials during login", async () => {
    const { getCurrentUser } = require("aws-amplify/auth")
    getCurrentUser.mockResolvedValue({ username: "tester", userId: "123" })
    
    const { facade, storagePort } = buildFacade()

    await facade.loginUser(defaultLoginRequest)

    expect(storagePort.saveString).toHaveBeenCalledWith("STORED_USERNAME", defaultLoginRequest.username)
    expect(storagePort.saveString).toHaveBeenCalledWith("STORED_PASSWORD", defaultLoginRequest.password)
  })

  it("removes stored credentials during logout", async () => {
    const { facade, storagePort } = buildFacade()

    await facade.logoutUser()

    expect(storagePort.remove).toHaveBeenCalledWith("STORED_USERNAME")
    expect(storagePort.remove).toHaveBeenCalledWith("STORED_PASSWORD")
  })

  it("handles registration with incomplete sign-in", async () => {
    const incompleteSignIn = jest.fn().mockResolvedValue({ 
      isSignedIn: false, 
      nextStep: { signInStep: "CONFIRM_SIGN_IN" } 
    })
    
    const { facade, storagePort } = buildFacade({ 
      cognitoSignIn: incompleteSignIn,
    })

    const result = await facade.registerUser(defaultRegistrationRequest)

    // Registration should still succeed despite incomplete sign-in
    expect(result).toEqual({ success: true })
    expect(storagePort.saveString).toHaveBeenCalledWith("IS_LOGGED_IN", "true")
  })

  it("handles registration backend failure without detail message", async () => {
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        register: jest.fn().mockResolvedValue({ ok: false, data: {} }),
      },
    })

    const result = await facade.registerUser(defaultRegistrationRequest)

    expect(result).toEqual({ success: false, errorMessage: "회원가입에 실패했습니다." })
  })

  it("handles login backend failure without detail message", async () => {
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        login: jest.fn().mockResolvedValue({ ok: false, data: {} }),
      },
    })

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: false, errorMessage: "로그인에 실패했습니다." })
  })
})
