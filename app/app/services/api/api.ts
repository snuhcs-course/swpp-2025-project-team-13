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
  MenuRecommendationResponse,
} from "./api.types"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 60000, // 60 seconds - recommendation API processes 695 menus with embeddings + OpenAI explanations (takes ~45-50s)
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
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
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

  async register(username: string, email: string, password: string) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    const res = await this.apisauce.post("/auth/register/", { username, email, password })
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

  async toggleScrap(restaurantId: number) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.post("/scraps/toggle/", { restaurant_id: restaurantId })
  }

  async toggleScrapWithName(restaurantId: string | null, restaurantName: string) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    
    const payload: any = { restaurant_name: restaurantName }
    if (restaurantId) {
      payload.restaurant_id = restaurantId
    }
    
    // Add CSRF token to payload body like the recommendation endpoint does
    const csrfToken = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (csrfToken) {
      payload.csrfmiddlewaretoken = csrfToken
    }
    
    return this.apisauce.post("/scraps/toggle/", payload)
  }

  async getScraps() {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.get("/scraps/")
  }

  async addScrap(restaurantId: number) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.post("/scraps/", { restaurant_id: restaurantId })
  }

  async deleteScrap(scrapId: number) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.delete(`/scraps/${scrapId}/`)
  }

  // NEW AWS Scrap Storage Methods
  async uploadUserScrapsToAWS(scraps: any[]) {
    // Upload user's scraped menus to AWS storage on logout
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.post("/scraps/upload-to-aws/", { scraps })
  }

  async downloadUserScrapsFromAWS() {
    // Download user's scraped menus from AWS storage on login
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.get("/scraps/download-from-aws/")
  }

  async getRestaurantDetail(restaurantId: number) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.get(`/restaurants/${restaurantId}/`)
  }

  async getPreferences() {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.get("/onboarding/")
  }

  async savePreferences(preferences: {
    spicy_level?: number
    sweet_level?: number
    salty_level?: number
    exploration_preference?: number
    allergies?: string[]
    disliked_ingredients?: string[]
    favorite_cuisines?: string[]
  }) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.post("/onboarding/", preferences)
  }

  async updatePreferences(preferences: {
    spicy_level?: number
    sweet_level?: number
    salty_level?: number
    exploration_preference?: number
    allergies?: string[]
    disliked_ingredients?: string[]
    favorite_cuisines?: string[]
  }) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.patch("/onboarding/update/", preferences)
  }

  async uploadPhoto(photoUrl: string, photoUri: string, imageBlob?: any) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()

    // Step 1: Create photo metadata record with S3 URL
    console.log(`Creating photo metadata: photoUrl="${photoUrl}", photoUri="${photoUri}"`)
    const metadataResponse = await this.apisauce.post("/photos/", {
      photo_url: photoUrl,
      local_uri: photoUri,
    })

    if (!metadataResponse.ok || !(metadataResponse.data as any)?.id) {
      console.error("Failed to create photo metadata:", metadataResponse)
      return metadataResponse
    }

    const photoId = (metadataResponse.data as any).id
    console.log(`Photo metadata created with ID ${photoId}`)

    // Step 2: If we have the image blob, process it with CLIP
    if (imageBlob && imageBlob.size > 0) {
      console.log(`Processing image with CLIP: ${imageBlob.size} bytes`)
      try {
        await this.processPhotoWithClip(photoId, imageBlob)
        console.log(`CLIP processing completed for photo ${photoId}`)
      } catch (error) {
        console.warn(`CLIP processing failed for photo ${photoId}: ${error}`)
        // Don't fail the upload if CLIP fails - photo is already created
      }
    }

    return metadataResponse
  }

  async processPhotoWithClip(photoId: number, imageBlob: any) {
    // ensure csrf header is present and cookies are attached
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      console.log("CSRF token missing, fetching...")
      await this.getCsrf()
    }
    await this.attachCookiesHeader()

    console.log(`Converting image blob (${imageBlob.size} bytes) to base64...`)

    // Convert blob to base64
    const base64Data = await this.blobToBase64(imageBlob)
    console.log(`Base64 data size: ${base64Data.length} bytes`)

    // Send as JSON body
    return this.apisauce.patch(`/photos/${photoId}/process_clip/`, {
      image_data: base64Data
    })
  }

  private async blobToBase64(blob: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        // Extract base64 part (after "data:...;base64,")
        const base64 = result.split(',')[1] || result
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async getUserPhotos(): Promise<any[]> {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return ((await this.apisauce.get("/photos/")).data as any) || [];
  }

  async updateImageLabel(photoId: number, newLabel: string) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.patch(`/photos/${photoId}/update_label/`, { label: newLabel })
  }

  async deleteImage(photoId: number) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.delete(`/photos/${photoId}/delete_image/`)
  }

  async searchFoods(query: string) {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()
    return this.apisauce.get("/photos/search_foods/", { q: query })
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

  /**
   * Get menu recommendations API call
   */
  async getMenuRecommendations(userLocation: [number, number], options?: {
    queryText?: string
    maxResults?: number
    budgetRange?: [number, number]
    distancePreference?: number
    timeOfDay?: string
    dayOfWeek?: string
  }): Promise<MenuRecommendationResponse> {
    // ensure csrf header is present; get it if missing
    // @ts-ignore - apisauce has no typed way to read headers set, so we check via getHeader
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()

    const requestData = {
      user_location: userLocation,
      ...options
    }

    const response = await this.apisauce.post('/recommendation/recommend/menu/', requestData)

    if (response.ok) {
      return response.data as MenuRecommendationResponse
    } else {
      throw new Error((response.data as any)?.error || 'Failed to request menu recommendations')
    }
  }

  /**
   * Stream menu recommendations one by one as they are processed by the backend
   * Returns an async iterator that yields items as they arrive
   */
  async *streamMenuRecommendations(userLocation: [number, number], options?: {
    queryText?: string
    maxResults?: number
  }) {
    // Ensure CSRF token is set up
    const csrfRes = await this.getCsrf()

    if (__DEV__) {
      console.log('🔐 CSRF Response:', {
        ok: csrfRes.ok,
        status: csrfRes.status,
        hasData: !!csrfRes.data,
        dataKeys: csrfRes.data ? Object.keys(csrfRes.data) : [],
      })
    }

    // Get the CSRF token from apisauce headers
    let csrfToken = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]

    if (!csrfToken) {
      // Try to get from response data directly
      const data: any = csrfRes.data
      if (data?.csrfToken) {
        csrfToken = data.csrfToken
        if (__DEV__) {
          console.log('✅ Got CSRF token from response data:', csrfToken)
        }
      } else {
        throw new Error('Failed to obtain CSRF token for streaming request')
      }
    } else {
      if (__DEV__) {
        console.log('🔑 CSRF Token from apisauce headers:', csrfToken)
      }
    }

    // Include CSRF token in request body as well as headers
    // (Django accepts CSRF token via header OR body)
    const requestData = {
      user_location: userLocation,
      csrfmiddlewaretoken: csrfToken,
      ...options
    }

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'Accept': 'application/x-ndjson',
      }

      if (__DEV__) {
        console.log('📡 Streaming request starting for:', {
          location: userLocation,
          csrfToken: csrfToken ? `${csrfToken.substring(0, 10)}...` : 'NOT SET',
          headers,
          requestBody: JSON.stringify(requestData),
          options,
        })
      }

      const response = await fetch(`${this.config.url}/recommendation/recommend/menu/`, {
        method: 'POST',
        headers,
        credentials: 'include', // Automatically includes session cookies
        body: JSON.stringify(requestData),
      })

      if (__DEV__) {
        console.log(`📥 Streaming response received:`, {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          cacheControl: response.headers.get('cache-control'),
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ HTTP ${response.status}: ${errorText}`)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // Check if response has a body
      if (!response.body) {
        console.warn(`⚠️ Response body is null, trying text-based streaming fallback`)

        // Fallback: Try reading as text if body is null
        const text = await response.text()
        if (!text) {
          console.error(`❌ No response content! Status: ${response.status}`)
          throw new Error('No response content - server may have rejected request')
        }

        if (__DEV__) {
          console.log(`📄 Got response as text (${text.length} chars)`)
        }

        // Parse NDJSON from text
        const lines = text.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed) {
            try {
              const data = JSON.parse(trimmed)
              if (__DEV__) {
                if (data.type === 'metadata') {
                  console.log(`📊 Streaming metadata: ${data.total_results} results expected`)
                } else if (data.type === 'result') {
                  console.log(`🍽️ Streamed menu: ${data.item?.menu_name}`)
                }
              }
              yield data
            } catch (e) {
              console.warn('⚠️ Failed to parse line:', trimmed, e)
            }
          }
        }
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        try {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (line) {
              try {
                const data = JSON.parse(line)
                if (__DEV__) {
                  if (data.type === 'metadata') {
                    console.log(`📊 Streaming metadata: ${data.total_results} results expected`)
                  } else if (data.type === 'result') {
                    console.log(`🍽️ Streamed menu: ${data.item?.menu_name}`)
                  }
                }
                yield data
              } catch (e) {
                console.warn('⚠️ Failed to parse streaming response line:', line, e)
              }
            }
          }

          buffer = lines[lines.length - 1]
        } catch (readError) {
          console.error('❌ Error reading from stream:', readError)
          throw readError
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer)
          yield data
        } catch (e) {
          console.warn('⚠️ Failed to parse final streaming response:', buffer, e)
        }
      }
    } catch (error) {
      console.error('❌ Streaming request error:', error)
      throw new Error(`Streaming request failed: ${error}`)
    }
  }

  // Phase 1: Get menu recommendations without reasons
  async getMenuRecommendationsPhase1(userLocation: [number, number], options?: {
    queryText?: string
    maxResults?: number
  }) {
    // ensure csrf header is present; get it if missing
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()

    const requestData = {
      user_location: userLocation,
      ...options
    }

    return this.apisauce.post("/recommendation/recommend/menu/phase1/", requestData)
  }

  // Phase 2: Get recommendation reasons for specific menus
  async getMenuRecommendationsPhase2(userLocation: [number, number], menuIds: string[], options?: {
    queryText?: string
  }) {
    // ensure csrf header is present; get it if missing
    const header = (this.apisauce as any).defaults?.headers?.common?.["X-CSRFToken"]
    if (!header) {
      await this.getCsrf()
    }
    await this.attachCookiesHeader()

    const requestData = {
      user_location: userLocation,
      menu_ids: menuIds,
      ...options
    }

    if (__DEV__) {
      console.log('📤 Phase 2 API request:', {
        url: '/recommendation/recommend/menu/phase2/',
        menuIdsCount: menuIds.length,
        requestData: JSON.stringify(requestData).substring(0, 200) + '...'
      })
    }

    const response = await this.apisauce.post("/recommendation/recommend/menu/phase2/", requestData)
    
    if (__DEV__) {
      console.log('📥 Phase 2 API response:', {
        status: response.status,
        ok: response.ok,
        problem: response.problem,
        dataKeys: response.data ? Object.keys(response.data) : null
      })
    }
    
    return response
  }

}

// Singleton instance of the API for convenience
export const api = new Api()
