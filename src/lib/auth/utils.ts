/**
 * Validates and sanitizes a return or callback URL to prevent open redirect attacks.
 * Only relative application paths starting with a single '/' are permitted.
 * Backslashes, protocol relative URLs, and external schemes fall back to /welcome.
 */
export function getSafeCallbackUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "/welcome"
  }

  const trimmed = rawUrl.trim()

  // Must begin with single forward slash and contain no backslashes or protocol relative prefixes
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "/welcome"
  }

  try {
    const parsed = new URL(trimmed, "http://localhost")
    if (parsed.origin === "http://localhost" && parsed.pathname.startsWith("/")) {
      return trimmed
    }
  } catch {
    return "/welcome"
  }

  return "/welcome"
}
