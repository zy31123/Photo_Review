export function createLRUCache<T>(maxSize: number) {
  const map = new Map<string, T>()

  function get(key: string): T | undefined {
    if (map.has(key)) {
      const value = map.get(key)!
      map.delete(key)
      map.set(key, value)
      return value
    }
    return undefined
  }

  function set(key: string, value: T): void {
    map.delete(key)
    map.set(key, value)
    if (map.size > maxSize) {
      const oldest = map.keys().next().value
      if (oldest !== undefined) map.delete(oldest)
    }
  }

  return { get, set, get size() { return map.size } }
}
