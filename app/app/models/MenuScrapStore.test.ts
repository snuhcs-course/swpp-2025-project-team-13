import { MenuScrapStoreModel } from "./MenuScrapStore"

describe("MenuScrapStore", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {})
    jest.spyOn(console, "trace").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const createTestMenu = (id: number | string) => ({
    id,
    menu_name: `Test Menu ${id}`,
    place_name: `Test Place ${id}`,
    price: 10000,
    category: "Korean",
    location: "Seoul",
    rating: 4.5,
    review_count: 100,
    image_url: "https://example.com/image.jpg",
    coordinates: [127.0, 37.5] as [number, number],
  })

  it("should create an empty store", () => {
    const store = MenuScrapStoreModel.create()
    expect(store.scrappedMenus.length).toBe(0)
  })

  it("should add a menu scrap", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    expect(store.scrappedMenus.length).toBe(1)
    expect(store.scrappedMenus[0].menu_name).toBe("Test Menu 1")
  })

  it("should not add duplicate menu scrap", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    store.addScrappedMenu(createTestMenu(1))
    expect(store.scrappedMenus.length).toBe(1)
  })

  it("should remove a menu scrap", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    expect(store.scrappedMenus.length).toBe(1)
    store.removeScrappedMenu(1)
    expect(store.scrappedMenus.length).toBe(0)
  })

  it("should handle removing non-existent menu", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    store.removeScrappedMenu(999)
    expect(store.scrappedMenus.length).toBe(1)
  })

  it("should toggle menu scrap (add)", () => {
    const store = MenuScrapStoreModel.create()
    const result = store.toggleScrappedMenu(createTestMenu(1))
    expect(result).toBe(true)
    expect(store.scrappedMenus.length).toBe(1)
  })

  it("should toggle menu scrap (remove)", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    const result = store.toggleScrappedMenu(createTestMenu(1))
    expect(result).toBe(false)
    expect(store.scrappedMenus.length).toBe(0)
  })

  it("should clear all scraps", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    store.addScrappedMenu(createTestMenu(2))
    expect(store.scrappedMenus.length).toBe(2)
    store.clearAllScraps()
    expect(store.scrappedMenus.length).toBe(0)
  })

  it("should return scrapped menus list in reverse order", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    store.addScrappedMenu(createTestMenu(2))
    const list = store.scrappedMenusList
    expect(list[0].id).toBe("2")
    expect(list[1].id).toBe("1")
  })

  it("should check if menu is scrapped", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    expect(store.isScrapped(1)).toBe(true)
    expect(store.isScrapped(2)).toBe(false)
  })

  it("should handle string id", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu("str-1"))
    expect(store.isScrapped("str-1")).toBe(true)
  })

  it("should handle null image_url", () => {
    const store = MenuScrapStoreModel.create()
    const menu = createTestMenu(1)
    delete (menu as any).image_url
    store.addScrappedMenu(menu)
    expect(store.scrappedMenus[0].image_url).toBeNull()
  })

  it("should set scrapped_at date", () => {
    const store = MenuScrapStoreModel.create()
    store.addScrappedMenu(createTestMenu(1))
    expect(store.scrappedMenus[0].scrapped_at).toBeInstanceOf(Date)
  })
})
