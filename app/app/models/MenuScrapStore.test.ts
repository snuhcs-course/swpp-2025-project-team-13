import { MenuScrapStoreModel, MenuScrapModel } from "./MenuScrapStore"

describe("MenuScrapStore", () => {
  const mockMenuItem = {
    id: 1,
    menu_name: "김치찌개",
    place_name: "맛있는 식당",
    price: 8000,
    category: "한식",
    location: "서울시 관악구",
    rating: 4.5,
    review_count: 100,
    image_url: "https://example.com/image.jpg",
    coordinates: [37.4783, 126.9516] as [number, number],
  }

  const mockMenuItem2 = {
    id: 2,
    menu_name: "된장찌개",
    place_name: "또다른 식당",
    price: 7000,
    category: "한식",
    location: "서울시 강남구",
    rating: 4.2,
    review_count: 50,
    image_url: null,
    coordinates: [37.5172, 127.0473] as [number, number],
  }

  describe("MenuScrapModel", () => {
    it("creates a menu scrap model with required properties", () => {
      const menuScrap = MenuScrapModel.create({
        id: "1",
        menu_name: "김치찌개",
        place_name: "맛있는 식당",
        price: 8000,
        category: "한식",
        location: "서울시 관악구",
        rating: 4.5,
        review_count: 100,
        image_url: "https://example.com/image.jpg",
        coordinates: [37.4783, 126.9516],
        scrapped_at: new Date(),
      })

      expect(menuScrap.menu_name).toBe("김치찌개")
      expect(menuScrap.place_name).toBe("맛있는 식당")
      expect(menuScrap.price).toBe(8000)
    })

    it("allows null image_url", () => {
      const menuScrap = MenuScrapModel.create({
        id: "1",
        menu_name: "김치찌개",
        place_name: "맛있는 식당",
        price: 8000,
        category: "한식",
        location: "서울시 관악구",
        rating: 4.5,
        review_count: 100,
        image_url: null,
        coordinates: [37.4783, 126.9516],
        scrapped_at: new Date(),
      })

      expect(menuScrap.image_url).toBeNull()
    })
  })

  describe("MenuScrapStoreModel", () => {
    let store: ReturnType<typeof MenuScrapStoreModel.create>

    beforeEach(() => {
      store = MenuScrapStoreModel.create({ scrappedMenus: [] })
    })

    describe("addScrappedMenu", () => {
      it("adds a new menu item to scrapped list", () => {
        store.addScrappedMenu(mockMenuItem)

        expect(store.scrappedMenus.length).toBe(1)
        expect(store.scrappedMenus[0].menu_name).toBe("김치찌개")
        expect(store.scrappedMenus[0].id).toBe("1")
      })

      it("converts numeric id to string", () => {
        store.addScrappedMenu(mockMenuItem)

        expect(store.scrappedMenus[0].id).toBe("1")
        expect(typeof store.scrappedMenus[0].id).toBe("string")
      })

      it("does not add duplicate items", () => {
        store.addScrappedMenu(mockMenuItem)
        store.addScrappedMenu(mockMenuItem)

        expect(store.scrappedMenus.length).toBe(1)
      })

      it("sets scrapped_at date", () => {
        const beforeAdd = new Date()
        store.addScrappedMenu(mockMenuItem)
        const afterAdd = new Date()

        expect(store.scrappedMenus[0].scrapped_at.getTime()).toBeGreaterThanOrEqual(
          beforeAdd.getTime()
        )
        expect(store.scrappedMenus[0].scrapped_at.getTime()).toBeLessThanOrEqual(afterAdd.getTime())
      })

      it("handles undefined image_url by setting to null", () => {
        const itemWithoutImage = { ...mockMenuItem, image_url: undefined }
        store.addScrappedMenu(itemWithoutImage)

        expect(store.scrappedMenus[0].image_url).toBeNull()
      })

      it("handles string id", () => {
        const itemWithStringId = { ...mockMenuItem, id: "string-id-123" }
        store.addScrappedMenu(itemWithStringId)

        expect(store.scrappedMenus[0].id).toBe("string-id-123")
      })
    })

    describe("removeScrappedMenu", () => {
      beforeEach(() => {
        store.addScrappedMenu(mockMenuItem)
        store.addScrappedMenu(mockMenuItem2)
      })

      it("removes a menu item by numeric id", () => {
        store.removeScrappedMenu(1)

        expect(store.scrappedMenus.length).toBe(1)
        expect(store.scrappedMenus[0].id).toBe("2")
      })

      it("removes a menu item by string id", () => {
        store.removeScrappedMenu("1")

        expect(store.scrappedMenus.length).toBe(1)
        expect(store.scrappedMenus[0].id).toBe("2")
      })

      it("does nothing when removing non-existent item", () => {
        store.removeScrappedMenu(999)

        expect(store.scrappedMenus.length).toBe(2)
      })
    })

    describe("toggleScrappedMenu", () => {
      it("adds item and returns true when item does not exist", () => {
        const result = store.toggleScrappedMenu(mockMenuItem)

        expect(result).toBe(true)
        expect(store.scrappedMenus.length).toBe(1)
      })

      it("removes item and returns false when item exists", () => {
        store.addScrappedMenu(mockMenuItem)
        const result = store.toggleScrappedMenu(mockMenuItem)

        expect(result).toBe(false)
        expect(store.scrappedMenus.length).toBe(0)
      })

      it("toggles correctly multiple times", () => {
        expect(store.toggleScrappedMenu(mockMenuItem)).toBe(true)
        expect(store.scrappedMenus.length).toBe(1)

        expect(store.toggleScrappedMenu(mockMenuItem)).toBe(false)
        expect(store.scrappedMenus.length).toBe(0)

        expect(store.toggleScrappedMenu(mockMenuItem)).toBe(true)
        expect(store.scrappedMenus.length).toBe(1)
      })
    })

    describe("views", () => {
      describe("scrappedMenusList", () => {
        it("returns empty array when no items", () => {
          expect(store.scrappedMenusList).toEqual([])
        })

        it("returns items in reverse order (most recent first)", () => {
          store.addScrappedMenu(mockMenuItem)
          store.addScrappedMenu(mockMenuItem2)

          const list = store.scrappedMenusList
          expect(list[0].id).toBe("2")
          expect(list[1].id).toBe("1")
        })
      })

      describe("isScrapped", () => {
        it("returns false when item is not scrapped", () => {
          expect(store.isScrapped(1)).toBe(false)
          expect(store.isScrapped("1")).toBe(false)
        })

        it("returns true when item is scrapped", () => {
          store.addScrappedMenu(mockMenuItem)

          expect(store.isScrapped(1)).toBe(true)
          expect(store.isScrapped("1")).toBe(true)
        })

        it("handles both numeric and string ids", () => {
          store.addScrappedMenu(mockMenuItem)

          expect(store.isScrapped(1)).toBe(true)
          expect(store.isScrapped("1")).toBe(true)
          expect(store.isScrapped(2)).toBe(false)
          expect(store.isScrapped("2")).toBe(false)
        })
      })
    })
  })
})

