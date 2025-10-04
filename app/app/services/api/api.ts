/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import {
  ApisauceInstance,
  create,
} from "apisauce"
import Config from "../../config"
import type {
  ApiConfig,
} from "./api.types"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
      // allow cookies to be sent/received for session auth
      withCredentials: true,
    })
  }

  async getCsrf() {
    const res = await this.apisauce.get("/auth/csrf/")
    try {
      const d: any = res.data
      const token: string | undefined = d?.csrfToken
      if (token) this.apisauce.setHeader("X-CSRFToken", token)
    } catch (e) {
      // ignore
    }
    return res
  }

  async login(username: string, password: string) {
    return this.apisauce.post("/auth/login/", { username, password })
  }

  async logout() {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    return this.apisauce.post("/auth/logout/")
  }

  async me() {
    return this.apisauce.get("/me/")
  }

}

// Singleton instance of the API for convenience
export const api = new Api()
