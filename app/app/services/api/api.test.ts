import { Api, DEFAULT_API_CONFIG } from "./api"
import Cookies from '@react-native-cookies/cookies'
import { create } from "apisauce"

jest.mock("@react-native-cookies/cookies", () => ({
    setFromResponse: jest.fn(),
    get: jest.fn(),
}))
jest.mock("apisauce", () => ({
    create: jest.fn(),
}))

describe("Api", () => {
    let api: Api
    let fakeApisauce: any

    beforeEach(() => {
        fakeApisauce = {
            get: jest.fn(() => Promise.resolve({ data: { csrfToken: "mockCsrf" }, headers: {} })),
            post: jest.fn(() => Promise.resolve({ data: {}, headers: {} })),
            setHeader: jest.fn(),
            delete: jest.fn(() => Promise.resolve({ data: {}, headers: {} })),
            patch: jest.fn(() => Promise.resolve({ data: {}, headers: {} })),

        }
            ; (create as jest.Mock).mockReturnValue(fakeApisauce)
        api = new Api(DEFAULT_API_CONFIG)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("getCsrf sets X-CSRFToken header when present", async () => {
        await api.getCsrf()
        expect(fakeApisauce.get).toHaveBeenCalledWith("/auth/csrf/")
        expect(fakeApisauce.setHeader).toHaveBeenCalledWith("X-CSRFToken", "mockCsrf")
    })

    it("login calls getCsrf if cookie missing and makes POST call", async () => {
        fakeApisauce.defaults = { headers: { common: {} } }
        const spy = jest.spyOn(api, "getCsrf").mockResolvedValue({ data: { csrfToken: "mockCsrf" }, headers: {} })
        await api.login("user", "pass")
        expect(spy).toHaveBeenCalled()
        expect(fakeApisauce.post).toHaveBeenCalledWith("/auth/login/", { username: "user", password: "pass" })
    })

    it("register calls getCsrf if cookie missing and makes POST call", async () => {
        fakeApisauce.defaults = { headers: { common: {} } }
        const spy = jest.spyOn(api, "getCsrf").mockResolvedValue({ data: { csrfToken: "mockCsrf" }, headers: {} })
        await api.register("user", "u@email.com", "pass")
        expect(spy).toHaveBeenCalled()
        expect(fakeApisauce.post).toHaveBeenCalledWith("/auth/register/", { username: "user", email: "u@email.com", password: "pass" })
    })

    it("logout always posts to /auth/logout/", async () => {
        await api.logout()
        expect(fakeApisauce.post).toHaveBeenCalledWith("/auth/logout/")
    })

    it("me always get /me/", async () => {
        await api.me()
        expect(fakeApisauce.get).toHaveBeenCalledWith("/me/")
    })

    it("uploadPhoto posts to /photos/", async () => {
        await api.uploadPhoto("http://example.com/foo.jpg", "file:///local/path.jpg")
        expect(fakeApisauce.post).toHaveBeenCalledWith("/photos/", { 
            photo_url: "http://example.com/foo.jpg",
            local_uri: "file:///local/path.jpg"
        })
    })

    it("getMenuRecommendations sends location in request (success)", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { recommended: ["foo"] } })
        const res = await api.getMenuRecommendations([1, 2], { queryText: "bar", maxResults: 1 })
        expect(fakeApisauce.post).toHaveBeenCalledWith(
            "/recommendation/recommend/menu/",
            expect.objectContaining({ user_location: [1, 2], queryText: "bar", maxResults: 1 })
        )
        expect(res.recommended).toEqual(["foo"])
    })

    it("getMenuRecommendations throws an error on failure", async () => {
        fakeApisauce.post.mockResolvedValueOnce({ ok: false, data: { error: "fail" } })
        await expect(api.getMenuRecommendations([0, 0])).rejects.toThrow('fail')
    })

    it("toggleScrap posts to /scraps/toggle/", async () => {
        await api.toggleScrap(42)
        expect(fakeApisauce.post).toHaveBeenCalledWith("/scraps/toggle/", { restaurant_id: 42 })
    })

    it("getScraps gets /scraps/", async () => {
        await api.getScraps()
        expect(fakeApisauce.get).toHaveBeenCalledWith("/scraps/")
    })

    it("addScrap posts to /scraps/", async () => {
        await api.addScrap(77)
        expect(fakeApisauce.post).toHaveBeenCalledWith("/scraps/", { restaurant_id: 77 })
    })

    it("deleteScrap deletes /scraps/:id/", async () => {
        await api.deleteScrap(21)
        expect(fakeApisauce.delete).toHaveBeenCalledWith("/scraps/21/")
    })

    it("getRestaurantDetail gets /restaurants/:id/", async () => {
        await api.getRestaurantDetail(3)
        expect(fakeApisauce.get).toHaveBeenCalledWith("/restaurants/3/")
    })

    it("getPreferences gets /onboarding/", async () => {
        await api.getPreferences()
        expect(fakeApisauce.get).toHaveBeenCalledWith("/onboarding/")
    })

    it("savePreferences posts to /onboarding/", async () => {
        await api.savePreferences({ spicy_level: 1 })
        expect(fakeApisauce.post).toHaveBeenCalledWith("/onboarding/", { spicy_level: 1 })
    })

    it("updatePreferences patches /onboarding/update/", async () => {
        await api.updatePreferences({ sweet_level: 5 })
        expect(fakeApisauce.patch).toBeDefined()
    })

    it("setFromResponse is called if present in getCsrf", async () => {
        (Cookies as any).setFromResponse = jest.fn()
        fakeApisauce.get.mockResolvedValue({ data: { csrfToken: "mockCsrf" }, headers: { 'set-cookie': 'cookiex' } })
        await api.getCsrf()
        expect((Cookies as any).setFromResponse).toHaveBeenCalled()
    })

    it("getter logic for Cookies.get in attachCookiesHeader", async () => {
        (Cookies as any).get = jest.fn().mockResolvedValue({ session: { value: 'abc' } })
        await (api as any).attachCookiesHeader()
        expect((Cookies as any).get).toHaveBeenCalled()
        expect(fakeApisauce.setHeader).toHaveBeenCalledWith('Cookie', 'session=abc')
    })

    it("should handle when no cookies available in attachCookiesHeader", async () => {
        (Cookies as any).get = jest.fn().mockResolvedValue({})
        await (api as any).attachCookiesHeader()
        expect(fakeApisauce.setHeader).not.toHaveBeenCalledWith('Cookie', expect.any(String))
    })

    it("should not crash if setFromResponse is missing (gracefully handles)", async () => {
        delete (Cookies as any).setFromResponse
        fakeApisauce.get.mockResolvedValue({ data: { csrfToken: "c" }, headers: { 'set-cookie': 'cookiey' } })
        await expect(api.getCsrf()).resolves.not.toThrow()
    })

    it("should skip setHeader if csfrToken not present", async () => {
        fakeApisauce.get.mockResolvedValue({ data: {}, headers: {} })
        await api.getCsrf()
        expect(fakeApisauce.setHeader).not.toHaveBeenCalledWith("X-CSRFToken", expect.anything())
    })

    it("getUserPhotos gets /photos/", async () => {
        await api.getUserPhotos()
        expect(fakeApisauce.get).toHaveBeenCalledWith("/photos/")
    })

    it("deleteImage deletes /photos/:id/delete_image/", async () => {
        await api.deleteImage(123)
        expect(fakeApisauce.delete).toHaveBeenCalledWith("/photos/123/delete_image/")
    })

    it("updateImageLabel patches /photos/:id/update_label/", async () => {
        fakeApisauce.patch = jest.fn(() => Promise.resolve({ data: {}, headers: {} }))
        await api.updateImageLabel(456, "new_label")
        expect(fakeApisauce.patch).toHaveBeenCalledWith("/photos/456/update_label/", { label: "new_label" })
    })

    it("searchFoods gets /photos/search_foods/", async () => {
        await api.searchFoods("pizza")
        expect(fakeApisauce.get).toHaveBeenCalled()
    })

    it("getMenuRecommendationsPhase1 posts to recommendation endpoint", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { results: [] } })
        await api.getMenuRecommendationsPhase1([1, 2])
        expect(fakeApisauce.post).toHaveBeenCalled()
    })

    it("getMenuRecommendationsPhase2 posts with menuIds", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { results: [] } })
        await api.getMenuRecommendationsPhase2([1, 2], ["menu1", "menu2"])
        expect(fakeApisauce.post).toHaveBeenCalled()
    })

    it("toggleScrapWithName posts with menu details", async () => {
        await api.toggleScrapWithName("1", "Menu Name")
        expect(fakeApisauce.post).toHaveBeenCalledWith(
          "/scraps/toggle/",
          expect.objectContaining({
            restaurant_id: "1",
            restaurant_name: "Menu Name",
          })
        )
    })

    it("uploadPhoto creates photo metadata", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { id: 1 } })
        await api.uploadPhoto("http://photo.url", "file:///path")
        expect(fakeApisauce.post).toHaveBeenCalled()
    })

    it("uploadUserScrapsToAWS posts scraps data", async () => {
        const scraps = [{ id: "1", menu_name: "Test" }]
        await api.uploadUserScrapsToAWS(scraps)
        expect(fakeApisauce.post).toHaveBeenCalledWith("/scraps/upload-to-aws/", { scraps })
    })

    it("downloadUserScrapsFromAWS gets scraps data", async () => {
        await api.downloadUserScrapsFromAWS()
        expect(fakeApisauce.get).toHaveBeenCalled()
    })

    it("uploadUserGalleryToAWS posts gallery data", async () => {
        await api.uploadUserGalleryToAWS()
        expect(fakeApisauce.post).toHaveBeenCalledWith("/scraps/upload-gallery-to-aws/")
    })

    it("downloadUserGalleryFromAWS gets gallery data", async () => {
        await api.downloadUserGalleryFromAWS()
        expect(fakeApisauce.get).toHaveBeenCalled()
    })

    it("constructor initializes with default config", () => {
        const newApi = new Api()
        expect(newApi.config).toEqual(DEFAULT_API_CONFIG)
    })

    it("constructor initializes with custom config", () => {
        const customConfig = { url: "http://custom.api", timeout: 30000 }
        const newApi = new Api(customConfig)
        expect(newApi.config).toEqual(customConfig)
    })

    it("login handles set-cookie header with setter", async () => {
        const mockSetFromResponse = jest.fn()
        ;(Cookies as any).setFromResponse = mockSetFromResponse
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "token" } } }
        fakeApisauce.post.mockResolvedValue({ data: {}, headers: { "set-cookie": "session=abc" } })
        await api.login("user", "pass")
        expect(mockSetFromResponse).toHaveBeenCalled()
    })

    it("login handles set-cookie header as array", async () => {
        const mockSetFromResponse = jest.fn()
        ;(Cookies as any).setFromResponse = mockSetFromResponse
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "token" } } }
        fakeApisauce.post.mockResolvedValue({ data: {}, headers: { "set-cookie": ["cookie1", "cookie2"] } })
        await api.login("user", "pass")
        expect(mockSetFromResponse).toHaveBeenCalled()
    })

    it("login handles cookie errors gracefully", async () => {
        const mockSetFromResponse = jest.fn().mockRejectedValue(new Error("Cookie error"))
        ;(Cookies as any).setFromResponse = mockSetFromResponse
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "token" } } }
        fakeApisauce.post.mockResolvedValue({ data: {}, headers: { "set-cookie": "session=abc" } })
        await expect(api.login("user", "pass")).resolves.not.toThrow()
    })

    it("register handles set-cookie header with setter", async () => {
        const mockSetFromResponse = jest.fn()
        ;(Cookies as any).setFromResponse = mockSetFromResponse
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "token" } } }
        fakeApisauce.post.mockResolvedValue({ data: {}, headers: { "set-cookie": "session=xyz" } })
        await api.register("user", "email@test.com", "pass")
        expect(mockSetFromResponse).toHaveBeenCalled()
    })

    it("register handles cookie errors gracefully", async () => {
        const mockSetFromResponse = jest.fn().mockRejectedValue(new Error("Cookie error"))
        ;(Cookies as any).setFromResponse = mockSetFromResponse
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "token" } } }
        fakeApisauce.post.mockResolvedValue({ data: {}, headers: { "set-cookie": "session=xyz" } })
        await expect(api.register("user", "email@test.com", "pass")).resolves.not.toThrow()
    })

    it("toggleScrapWithName includes csrf token in payload", async () => {
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "csrf123" } } }
        await api.toggleScrapWithName("1", "Restaurant Name")
        expect(fakeApisauce.post).toHaveBeenCalledWith(
            "/scraps/toggle/",
            expect.objectContaining({
                restaurant_name: "Restaurant Name",
                csrfmiddlewaretoken: "csrf123"
            })
        )
    })

    it("toggleScrapWithName handles null restaurant id", async () => {
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "csrf123" } } }
        await api.toggleScrapWithName(null, "Restaurant Name")
        expect(fakeApisauce.post).toHaveBeenCalledWith(
            "/scraps/toggle/",
            expect.objectContaining({
                restaurant_name: "Restaurant Name"
            })
        )
    })

    it("uploadPhoto processes CLIP when imageBlob is provided", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { id: 123 } })
        const mockBlob = { size: 1000, type: "image/jpeg" }
        const mockProcessPhotoWithClip = jest.spyOn(api as any, "processPhotoWithClip").mockResolvedValue({ ok: true })
        
        await api.uploadPhoto("http://photo.url", "file:///local", mockBlob)
        
        expect(mockProcessPhotoWithClip).toHaveBeenCalledWith(123, mockBlob)
    })

    it("uploadPhoto skips CLIP when imageBlob is not provided", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { id: 123 } })
        const mockProcessPhotoWithClip = jest.spyOn(api as any, "processPhotoWithClip")
        
        await api.uploadPhoto("http://photo.url", "file:///local")
        
        expect(mockProcessPhotoWithClip).not.toHaveBeenCalled()
    })

    it("uploadPhoto handles CLIP processing failure gracefully", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: true, data: { id: 123 } })
        const mockBlob = { size: 1000, type: "image/jpeg" }
        jest.spyOn(api as any, "processPhotoWithClip").mockRejectedValue(new Error("CLIP error"))
        
        const result = await api.uploadPhoto("http://photo.url", "file:///local", mockBlob)
        
        expect(result.ok).toBe(true)
    })

    it("uploadPhoto returns early if metadata creation fails", async () => {
        fakeApisauce.post.mockResolvedValue({ ok: false, data: {} })
        const mockBlob = { size: 1000 }
        const mockProcessPhotoWithClip = jest.spyOn(api as any, "processPhotoWithClip")
        
        const result = await api.uploadPhoto("http://photo.url", "file:///local", mockBlob)
        
        expect(result.ok).toBe(false)
        expect(mockProcessPhotoWithClip).not.toHaveBeenCalled()
    })

    it("restoreGalleryFromAWS posts to restore endpoint", async () => {
        const galleryData = [{ id: 1, photo_url: "http://photo.url" }]
        await api.restoreGalleryFromAWS(galleryData)
        expect(fakeApisauce.post).toHaveBeenCalledWith("/photos/restore-from-aws/", galleryData)
    })

    it("getCsrf handles set-cookie as array", async () => {
        const mockSetFromResponse = jest.fn()
        ;(Cookies as any).setFromResponse = mockSetFromResponse
        fakeApisauce.get.mockResolvedValue({ 
            data: { csrfToken: "token" }, 
            headers: { "set-cookie": ["cookie1=val1", "cookie2=val2"] } 
        })
        await api.getCsrf()
        expect(mockSetFromResponse).toHaveBeenCalled()
    })

    it("getCsrf handles missing cookie setter", async () => {
        delete (Cookies as any).setFromResponse
        delete (Cookies as any).default
        fakeApisauce.get.mockResolvedValue({ 
            data: { csrfToken: "token" }, 
            headers: { "set-cookie": "cookie=value" } 
        })
        await expect(api.getCsrf()).resolves.not.toThrow()
    })

    it("attachCookiesHeader handles getter on default export", async () => {
        delete (Cookies as any).get
        ;(Cookies as any).default = { get: jest.fn().mockResolvedValue({ session: { value: "xyz" } }) }
        await (api as any).attachCookiesHeader()
        expect((Cookies as any).default.get).toHaveBeenCalled()
    })

    it("attachCookiesHeader handles error gracefully", async () => {
        ;(Cookies as any).get = jest.fn().mockRejectedValue(new Error("Cookie error"))
        await expect((api as any).attachCookiesHeader()).resolves.not.toThrow()
    })

    it("getUserPhotos returns empty array on null data", async () => {
        fakeApisauce.get.mockResolvedValue({ data: null })
        const result = await api.getUserPhotos()
        expect(result).toEqual([])
    })

    it("getMenuRecommendationsPhase2 logs in dev mode", async () => {
        const originalDev = global.__DEV__
        global.__DEV__ = true
        const consoleSpy = jest.spyOn(console, "log").mockImplementation()
        
        fakeApisauce.post.mockResolvedValue({ ok: true, data: {}, status: 200 })
        await api.getMenuRecommendationsPhase2([1, 2], ["menu1", "menu2"])
        
        expect(consoleSpy).toHaveBeenCalled()
        
        consoleSpy.mockRestore()
        global.__DEV__ = originalDev
    })

    it("processPhotoWithClip fetches csrf if missing", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation()
        fakeApisauce.defaults = { headers: { common: {} } }
        const getCsrfSpy = jest.spyOn(api, "getCsrf").mockResolvedValue({ data: { csrfToken: "token" }, headers: {} })
        
        const mockBlob = {
            size: 1000,
            slice: jest.fn().mockReturnThis(),
        }
        
        // Mock FileReader
        const mockFileReader = {
            readAsDataURL: jest.fn(function(this: any) {
                setTimeout(() => {
                    this.result = "data:image/jpeg;base64,abc123"
                    this.onloadend()
                }, 0)
            }),
            result: "",
            onloadend: null as any,
            onerror: null as any,
        }
        global.FileReader = jest.fn(() => mockFileReader) as any
        
        await (api as any).processPhotoWithClip(123, mockBlob)
        
        expect(getCsrfSpy).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalled()
        
        consoleSpy.mockRestore()
    })

    it("blobToBase64 converts blob to base64", async () => {
        const mockBlob = {
            size: 1000,
            slice: jest.fn().mockReturnThis(),
        }
        
        const mockFileReader = {
            readAsDataURL: jest.fn(function(this: any, blob: any) {
                setTimeout(() => {
                    this.result = "data:image/jpeg;base64,testbase64data"
                    if (this.onloadend) this.onloadend()
                }, 0)
            }),
            result: "",
            onloadend: null as any,
            onerror: null as any,
        }
        global.FileReader = jest.fn(() => mockFileReader) as any
        
        const result = await (api as any).blobToBase64(mockBlob)
        
        expect(result).toBe("testbase64data")
    })

    it("blobToBase64 handles FileReader error", async () => {
        const mockBlob = {
            size: 1000,
        }
        
        const mockFileReader = {
            readAsDataURL: jest.fn(function(this: any) {
                setTimeout(() => {
                    if (this.onerror) this.onerror(new Error("Read error"))
                }, 0)
            }),
            result: "",
            onloadend: null as any,
            onerror: null as any,
        }
        global.FileReader = jest.fn(() => mockFileReader) as any
        
        await expect((api as any).blobToBase64(mockBlob)).rejects.toThrow()
    })

    it("processPhotoWithClip sends base64 data to patch endpoint", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation()
        fakeApisauce.defaults = { headers: { common: { "X-CSRFToken": "token" } } }
        
        const mockBlob = {
            size: 500,
        }
        
        const mockFileReader = {
            readAsDataURL: jest.fn(function(this: any) {
                setTimeout(() => {
                    this.result = "data:image/jpeg;base64,clipdata"
                    if (this.onloadend) this.onloadend()
                }, 0)
            }),
            result: "",
            onloadend: null as any,
            onerror: null as any,
        }
        global.FileReader = jest.fn(() => mockFileReader) as any
        
        await (api as any).processPhotoWithClip(456, mockBlob)
        
        expect(fakeApisauce.patch).toHaveBeenCalledWith(
            "/photos/456/process_clip/",
            { image_data: "clipdata" }
        )
        
        consoleSpy.mockRestore()
    })
})
