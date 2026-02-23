/** localStorage から JSON を安全に読み取る */
export function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    console.warn(`Failed to parse localStorage key "${key}", using fallback`);
    return fallback;
  }
}
