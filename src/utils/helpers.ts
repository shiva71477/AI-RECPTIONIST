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

/**
 * Cleans string inputs to ensure they contain only safe plain UTF-8 text for Twilio <Say>.
 * Strips markdown, HTML, XML, SSML, emojis, bullets, raw ampersands, and limits length to ~400 chars.
 */
export function cleanTextForSay(text: string | null | undefined): string {
  if (!text) {
    return "I'm sorry, I didn't catch that. Could you please repeat it?";
  }

  let cleaned = text;

  // 1. Remove emojis and pictographs
  cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, '');

  // 2. Remove HTML / XML / SSML tags
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

  // 3. Remove Markdown syntax (bold **, italic *, code \`, strikethrough ~)
  cleaned = cleaned.replace(/[\*\_\`\~]/g, '');

  // 4. Strip leading bullets, list markers, or headers
  cleaned = cleaned.replace(/^[\s\-\•\+\*#]+\s*/gm, '');

  // 5. Replace ampersands with 'and' for clean pronunciation and safe XML parsing
  cleaned = cleaned.replace(/&/g, ' and ');

  // 6. Escape XML character delimiters by changing brackets to safe whitespace
  cleaned = cleaned.replace(/</g, ' ').replace(/>/g, ' ');

  // 7. Limit length to ~400 characters, trying to end on a clean sentence or space
  if (cleaned.length > 400) {
    const truncated = cleaned.substring(0, 397);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 300) {
      cleaned = truncated.substring(0, lastSpace) + '...';
    } else {
      cleaned = truncated + '...';
    }
  }

  return cleaned.trim() || "I'm sorry, can you please repeat that?";
}

