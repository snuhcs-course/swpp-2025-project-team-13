import { getImage } from "./imagenameFromAsseturi"
import type { Asset } from "expo-media-library"

describe("getImage", () => {
  it("extracts filename from URI", () => {
    const asset = {
      uri: "file:///storage/emulated/0/DCIM/Camera/IMG_20240101_120000.jpg",
      id: "123",
    } as Asset

    const result = getImage(asset)
    expect(result).toBe("IMG_20240101_120000.jpg")
  })

  it("handles URI with multiple path segments", () => {
    const asset = {
      uri: "file:///path/to/some/deeply/nested/folder/photo.png",
      id: "456",
    } as Asset

    const result = getImage(asset)
    expect(result).toBe("photo.png")
  })

  it("returns fallback name when URI has no filename", () => {
    const asset = {
      uri: "",
      id: "789",
    } as Asset

    const result = getImage(asset)
    expect(result).toBe("image_789.jpg")
  })

  it("handles URI ending with slash", () => {
    const asset = {
      uri: "file:///some/path/",
      id: "101",
    } as Asset

    const result = getImage(asset)
    // pop() returns empty string for trailing slash, which is falsy
    expect(result).toBe("image_101.jpg")
  })

  it("handles various file extensions", () => {
    const extensions = ["jpg", "jpeg", "png", "gif", "webp", "heic"]

    for (const ext of extensions) {
      const asset = {
        uri: `file:///path/to/image.${ext}`,
        id: "123",
      } as Asset

      const result = getImage(asset)
      expect(result).toBe(`image.${ext}`)
    }
  })

  it("handles filenames with special characters", () => {
    const asset = {
      uri: "file:///path/to/my-photo_2024 (1).jpg",
      id: "123",
    } as Asset

    const result = getImage(asset)
    expect(result).toBe("my-photo_2024 (1).jpg")
  })

  it("handles content URI format", () => {
    const asset = {
      uri: "content://media/external/images/media/12345",
      id: "12345",
    } as Asset

    const result = getImage(asset)
    // Last segment is "12345"
    expect(result).toBe("12345")
  })

  it("handles asset URI with query parameters", () => {
    const asset = {
      uri: "file:///path/to/image.jpg?size=large",
      id: "123",
    } as Asset

    const result = getImage(asset)
    expect(result).toBe("image.jpg?size=large")
  })

  it("uses asset id in fallback name", () => {
    const asset = {
      uri: "",
      id: "unique-asset-id-123",
    } as Asset

    const result = getImage(asset)
    expect(result).toBe("image_unique-asset-id-123.jpg")
  })
})

