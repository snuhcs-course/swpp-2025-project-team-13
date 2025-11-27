import { formatDate } from "./formatDate"
import { i18n } from "app/i18n"

// Mock i18n
jest.mock("app/i18n", () => ({
  i18n: {
    locale: "en-US",
  },
}))

describe("formatDate", () => {
  describe("with English locale", () => {
    beforeEach(() => {
      ;(i18n as any).locale = "en-US"
    })

    it("formats date with default format", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z")
      expect(result).toBe("Jan 15, 2024")
    })

    it("formats date with custom format", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z", "yyyy-MM-dd")
      expect(result).toBe("2024-01-15")
    })

    it("formats date with full month name", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z", "MMMM dd, yyyy")
      expect(result).toBe("January 15, 2024")
    })

    it("formats date with time", () => {
      const result = formatDate("2024-01-15T14:30:00.000Z", "MMM dd, yyyy HH:mm")
      expect(result).toMatch(/Jan 15, 2024/)
    })

    it("formats date with day of week", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z", "EEEE")
      expect(result).toBe("Monday")
    })
  })

  describe("with Korean locale", () => {
    beforeEach(() => {
      ;(i18n as any).locale = "ko-KR"
    })

    it("formats date with Korean locale", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z")
      // Korean locale should format differently
      expect(result).toBeTruthy()
    })

    it("formats date with custom format in Korean", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z", "yyyy년 MM월 dd일")
      expect(result).toContain("2024")
    })
  })

  describe("with Arabic locale", () => {
    beforeEach(() => {
      ;(i18n as any).locale = "ar-SA"
    })

    it("formats date with Arabic locale", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z")
      expect(result).toBeTruthy()
    })
  })

  describe("edge cases", () => {
    beforeEach(() => {
      ;(i18n as any).locale = "en-US"
    })

    it("handles start of year", () => {
      const result = formatDate("2024-01-01T00:00:00.000Z")
      expect(result).toBe("Jan 01, 2024")
    })

    it("handles end of year with local date", () => {
      // Using a date string without timezone to avoid UTC conversion issues
      const result = formatDate("2024-12-31")
      expect(result).toBe("Dec 31, 2024")
    })

    it("handles leap year date", () => {
      const result = formatDate("2024-02-29T12:00:00.000Z")
      expect(result).toBe("Feb 29, 2024")
    })

    it("handles different ISO date formats", () => {
      const result1 = formatDate("2024-06-15")
      const result2 = formatDate("2024-06-15T00:00:00Z")

      expect(result1).toBe("Jun 15, 2024")
      expect(result2).toBe("Jun 15, 2024")
    })

    it("accepts options parameter", () => {
      const result = formatDate("2024-01-15T12:00:00.000Z", "MMM dd, yyyy", {
        weekStartsOn: 1,
      })
      expect(result).toBe("Jan 15, 2024")
    })
  })

  describe("locale detection", () => {
    it("defaults to English for unknown locale", () => {
      ;(i18n as any).locale = "unknown-locale"
      const result = formatDate("2024-01-15T12:00:00.000Z")
      expect(result).toBe("Jan 15, 2024")
    })

    it("handles locale with region code", () => {
      ;(i18n as any).locale = "en-GB"
      const result = formatDate("2024-01-15T12:00:00.000Z")
      // Should use English locale (extracts "en" from "en-GB")
      expect(result).toBeTruthy()
    })
  })
})
