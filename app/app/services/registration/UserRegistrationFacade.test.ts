import { UserRegistrationFacade } from "./UserRegistrationFacade"

const defaultRequest = {
  username: "tester",
  email: "tester@example.com",
  password: "supersafe!",
}

const mockApi = () => ({
  getCsrf: jest.fn().mockResolvedValue(undefined),
  register: jest.fn().mockResolvedValue({ ok: true, data: {} }),
})

const mockStorage = () => ({
  saveString: jest.fn().mockResolvedValue(true),
})

const mockCognito = () => jest.fn().mockResolvedValue({ isSignUpComplete: true })

const mockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
})

const buildFacade = (
  overrides: Partial<ConstructorParameters<typeof UserRegistrationFacade>[0]> = {},
) => {
  const apiClient = overrides.apiClient ?? mockApi()
  const storagePort = overrides.storagePort ?? mockStorage()
  const cognitoSignUp = overrides.cognitoSignUp ?? mockCognito()
  const logger = overrides.logger ?? mockLogger()

  const facade = new UserRegistrationFacade({
    apiClient,
    storagePort,
    cognitoSignUp,
    logger,
  })

  return { facade, apiClient, storagePort, cognitoSignUp, logger }
}

describe("UserRegistrationFacade", () => {
  it("completes registration when all steps succeed", async () => {
    const { facade, apiClient, storagePort, cognitoSignUp } = buildFacade()

    const result = await facade.registerUser(defaultRequest)

    expect(result).toEqual({ success: true })
    expect(apiClient.getCsrf).toHaveBeenCalled()
    expect(apiClient.register).toHaveBeenCalledWith(
      defaultRequest.username,
      defaultRequest.email,
      defaultRequest.password,
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

    const result = await facade.registerUser(defaultRequest)

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

    const result = await facade.registerUser(defaultRequest)

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe("AWS 회원가입 도중 문제가 발생했습니다.")
    expect(storagePort.saveString).not.toHaveBeenCalled()
  })
})

