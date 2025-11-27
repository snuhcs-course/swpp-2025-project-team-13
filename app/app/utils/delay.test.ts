import { delay } from "./delay"

describe("delay", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns a promise", () => {
    const result = delay(100)
    expect(result).toBeInstanceOf(Promise)
  })

  it("resolves after specified time", async () => {
    const callback = jest.fn()
    
    delay(1000).then(callback)
    
    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled()
    
    // Fast-forward time
    jest.advanceTimersByTime(1000)
    
    // Wait for promise to resolve
    await Promise.resolve()
    
    expect(callback).toHaveBeenCalled()
  })

  it("does not resolve before specified time", async () => {
    const callback = jest.fn()
    
    delay(1000).then(callback)
    
    // Fast-forward less than the delay time
    jest.advanceTimersByTime(999)
    
    await Promise.resolve()
    
    expect(callback).not.toHaveBeenCalled()
  })

  it("resolves with undefined", async () => {
    const promise = delay(100)
    
    jest.advanceTimersByTime(100)
    
    const result = await promise
    expect(result).toBeUndefined()
  })

  it("works with 0ms delay", async () => {
    const callback = jest.fn()
    
    delay(0).then(callback)
    
    jest.advanceTimersByTime(0)
    await Promise.resolve()
    
    expect(callback).toHaveBeenCalled()
  })

  it("can be used with async/await", async () => {
    const startTime = Date.now()
    
    const delayPromise = delay(500)
    jest.advanceTimersByTime(500)
    await delayPromise
    
    // Test should complete without hanging
    expect(true).toBe(true)
  })

  it("multiple delays run independently", async () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    
    delay(100).then(callback1)
    delay(200).then(callback2)
    
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    
    expect(callback1).toHaveBeenCalled()
    expect(callback2).not.toHaveBeenCalled()
    
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    
    expect(callback2).toHaveBeenCalled()
  })
})

