import type { Api } from "../api"
import { api } from "../api"
import * as storage from "app/utils/storage"
import { signUp } from "aws-amplify/auth"

interface RegistrationApi extends Pick<Api, "getCsrf" | "register"> {}
interface StoragePort {
  saveString(key: string, value: string): Promise<boolean>
}

export interface RegistrationRequest {
  username: string
  email: string
  password: string
}

export interface RegistrationResult {
  success: boolean
  errorMessage?: string
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export interface UserRegistrationFacadeOptions {
  apiClient?: RegistrationApi
  storagePort?: StoragePort
  cognitoSignUp?: typeof signUp
  logger?: Logger
}

/**
 * Facade encapsulating the multiple steps needed for user registration (Django backend,
 * AWS Cognito, and local state persistence). Screens can now rely on a single entry point,
 * keeping UI code lean while enabling easier testing and substitution of dependencies.
 */
export class UserRegistrationFacade {
  private apiClient: RegistrationApi
  private storagePort: StoragePort
  private cognitoSignUp: typeof signUp
  private logger: Logger

  constructor(options: UserRegistrationFacadeOptions = {}) {
    this.apiClient = options.apiClient ?? api
    this.storagePort = options.storagePort ?? { saveString: storage.saveString }
    this.cognitoSignUp = options.cognitoSignUp ?? signUp
    this.logger =
      options.logger ??
      ({
        info: (message: string, meta?: Record<string, unknown>) => console.log(message, meta),
        error: (message: string, meta?: Record<string, unknown>) => console.error(message, meta),
      } as Logger)
  }

  async registerUser(request: RegistrationRequest): Promise<RegistrationResult> {
    this.logger.info("registration:start", { username: request.username })
    try {
      await this.apiClient.getCsrf()
    } catch (error) {
      this.logger.error("registration:csrf_failed", { username: request.username, error })
      return { success: false, errorMessage: "보안 토큰을 가져오지 못했습니다." }
    }

    const response = await this.apiClient.register(request.username, request.email, request.password)
    if (!response.ok) {
      const detail = (response.data as any)?.detail
      this.logger.error("registration:backend_failed", {
        username: request.username,
        email: request.email,
        detail,
      })
      return { success: false, errorMessage: detail ?? "회원가입에 실패했습니다." }
    }

    try {
      const { isSignUpComplete, nextStep } = await this.cognitoSignUp({
        username: request.username,
        password: request.password,
        options: {
          userAttributes: { email: request.email },
          autoSignIn: true,
        },
      } as any)

      if (!isSignUpComplete) {
        throw new Error(
          `회원가입이 완료되지 않았습니다. 다음 단계: ${JSON.stringify(nextStep)}`,
        )
      }
    } catch (error) {
      this.logger.error("registration:cognito_failed", { username: request.username, error })
      return {
        success: false,
        errorMessage: "AWS 회원가입 도중 문제가 발생했습니다.",
      }
    }

    await this.storagePort.saveString("IS_LOGGED_IN", "true")
    this.logger.info("registration:success", { username: request.username })
    return { success: true }
  }
}

export const userRegistrationFacade = new UserRegistrationFacade()

