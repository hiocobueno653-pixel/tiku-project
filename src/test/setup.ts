import { beforeEach } from 'vitest'

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value))
  }
}

const storage = new MemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
  writable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: globalThis as unknown as Window & typeof globalThis,
  configurable: true,
  writable: true,
})

// jsdom 未实现 scrollTo，测试中组件调用时静默 stub
if (typeof (globalThis as { scrollTo?: unknown }).scrollTo !== 'function') {
  Object.defineProperty(globalThis, 'scrollTo', {
    value: () => undefined,
    configurable: true,
    writable: true,
  })
}

// jsdom 未实现 matchMedia；固定为 light（matches=false）以便测试可预测
Object.defineProperty(globalThis, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
  configurable: true,
  writable: true,
})

beforeEach(() => {
  window.localStorage.clear()
})
