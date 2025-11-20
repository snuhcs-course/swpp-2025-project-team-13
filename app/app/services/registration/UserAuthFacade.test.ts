import { UserAuthFacade } from "./UserAuthFacade"

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
    const { facade, apiClient, storagePort, cognitoSignIn } = buildFacade()

    const result = await facade.loginUser(defaultLoginRequest)

    expect(result).toEqual({ success: true, hasPreferences: true })
    expect(apiClient.login).toHaveBeenCalledWith(
      defaultLoginRequest.username,
      defaultLoginRequest.password,
    )
    expect(cognitoSignIn).toHaveBeenCalled()
    expect(storagePort.saveString).toHaveBeenCalledWith("IS_LOGGED_IN", "true")
  })

  it("navigates users without preferences to onboarding", async () => {
    const { facade } = buildFacade({
      apiClient: {
        ...mockApi(),
        getPreferences: jest.fn().mockResolvedValue({ ok: false }),
      },
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
})

