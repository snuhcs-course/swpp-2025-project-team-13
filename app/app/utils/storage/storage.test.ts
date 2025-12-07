import AsyncStorage from "@react-native-async-storage/async-storage"
import { load, loadString, save, saveString, clear, remove } from "./storage"

// fixtures
const VALUE_OBJECT = { x: 1 }
const VALUE_STRING = JSON.stringify(VALUE_OBJECT)

beforeEach(() => (AsyncStorage.getItem as jest.Mock).mockReturnValue(Promise.resolve(VALUE_STRING)))
afterEach(() => jest.clearAllMocks())

test("load", async () => {
  const value = await load("something")
  expect(value).toEqual(JSON.parse(VALUE_STRING))
})

test("loadString", async () => {
  const value = await loadString("something")
  expect(value).toEqual(VALUE_STRING)
})

test("save", async () => {
  await save("something", VALUE_OBJECT)
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("something", VALUE_STRING)
})

test("saveString", async () => {
  await saveString("something", VALUE_STRING)
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("something", VALUE_STRING)
})

test("remove", async () => {
  await remove("something")
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith("something")
})

test("clear", async () => {
  await clear()
  expect(AsyncStorage.clear).toHaveBeenCalledWith()
})

test("loadString returns null on error", async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))
  const value = await loadString("something")
  expect(value).toBeNull()
})

test("saveString returns false on error", async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))
  const result = await saveString("something", "value")
  expect(result).toBe(false)
})

test("load returns null on error", async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))
  const value = await load("something")
  expect(value).toBeNull()
})

test("load returns null on invalid JSON", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("invalid json{")
  const value = await load("something")
  expect(value).toBeNull()
})

test("save returns false on error", async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))
  const result = await save("something", VALUE_OBJECT)
  expect(result).toBe(false)
})

test("remove handles errors gracefully", async () => {
  (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))
  await expect(remove("something")).resolves.toBeUndefined()
})

test("clear handles errors gracefully", async () => {
  (AsyncStorage.clear as jest.Mock).mockRejectedValueOnce(new Error("Storage error"))
  await expect(clear()).resolves.toBeUndefined()
})