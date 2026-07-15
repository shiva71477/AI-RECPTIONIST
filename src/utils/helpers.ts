/**
 * Async-safe sleep utility.
 * @param ms - Milliseconds to wait.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns the current UTC ISO timestamp string.
 */
export function utcNow(): string {
  return new Date().toISOString();
}

/**
 * Strips undefined/null fields from an object (shallow).
 */
export function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>;
}

/**
 * Safely parses a JSON string, returning null on failure instead of throwing.
 */
export function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
