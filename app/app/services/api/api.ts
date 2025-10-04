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
import Cookies from '@react-native-cookies/cookies'
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
      // persist any Set-Cookie header into native cookie store so subsequent
      // requests from the device will include session cookies.
      // apisauce exposes response headers on `res.headers`.
      const setCookie = (res as any).headers?.['set-cookie'] || (res as any).headers?.['Set-Cookie']
      if (setCookie) {
        // setFromResponse accepts the full Set-Cookie header string and stores cookie(s)
        try {
          // Some releases expose setFromResponse on default export, or as a named fn.
          const setter: any = (Cookies as any).setFromResponse || (Cookies as any).default?.setFromResponse || Cookies.setFromResponse
          if (setter) {
            await setter.call(Cookies, this.config.url, Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie))
          }
        } catch (e) {
          // ignore and continue
        }
      }
    } catch (e) {
      // ignore
    }
    return res
  }

  async login(username: string, password: string) {
    const res = await this.apisauce.post("/auth/login/", { username, password })
    try {
      const setCookie = (res as any).headers?.['set-cookie'] || (res as any).headers?.['Set-Cookie']
      if (setCookie) {
        try {
          const setter: any = (Cookies as any).setFromResponse || (Cookies as any).default?.setFromResponse || Cookies.setFromResponse
          if (setter) {
            await setter.call(Cookies, this.config.url, Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie))
            // ensure apisauce has a Cookie header from native store for immediate subsequent requests
            await this.attachCookiesHeader()
          }
        } catch (e) {
          // ignore cookie persistence errors
        }
      }
    } catch (e) {
      // ignore
    }
    return res
  }

  async logout() {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    // ensure native cookies are attached as a Cookie header (safe fallback)
    await this.attachCookiesHeader()
    return this.apisauce.post("/auth/logout/")
  }

  async me() {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.get("/me/")
  }

  private async attachCookiesHeader() {
    try {
  // Cookies.get may be exposed on default or named export depending on version.
  const getter: any = (Cookies as any).get || (Cookies as any).default?.get || Cookies.get
  const cookies = getter ? await getter.call(Cookies, this.config.url) : {}
      if (cookies && Object.keys(cookies).length > 0) {
        const cookieString = Object.keys(cookies)
          .map(name => `${name}=${(cookies as any)[name].value}`)
          .join('; ')
        if (cookieString) this.apisauce.setHeader('Cookie', cookieString)
      }
    } catch (e) {
      // ignore if cookie read fails
    }
  }

}

// Singleton instance of the API for convenience
export const api = new Api()
