import { describe, it, expect } from "vitest"
import { GET, POST } from "@/app/api/auth/[...all]/route"
import { getSafeCallbackUrl } from "@/lib/auth/utils"

describe("Login and Auth API Handlers (AC-1, AC-3, AC-5)", () => {
  describe("API route handlers export (covers: AC-1)", () => {
    it("exports valid GET and POST handlers for Next.js catch-all route", () => {
      expect(GET).toBeDefined()
      expect(typeof GET).toBe("function")
      expect(POST).toBeDefined()
      expect(typeof POST).toBe("function")
    })
  })

  describe("Callback URL sanitization and open redirect protection (covers: AC-5)", () => {
    it("defaults to /welcome when callbackUrl is null or empty", () => {
      expect(getSafeCallbackUrl(null)).toBe("/welcome")
      expect(getSafeCallbackUrl(undefined)).toBe("/welcome")
      expect(getSafeCallbackUrl("")).toBe("/welcome")
      expect(getSafeCallbackUrl("   ")).toBe("/welcome")
    })

    it("accepts valid relative paths", () => {
      expect(getSafeCallbackUrl("/welcome")).toBe("/welcome")
      expect(getSafeCallbackUrl("/about")).toBe("/about")
      expect(getSafeCallbackUrl("/automation?step=2")).toBe("/automation?step=2")
      expect(getSafeCallbackUrl("/launch")).toBe("/launch")
    })

    it("rejects absolute external URLs to prevent open redirects", () => {
      expect(getSafeCallbackUrl("https://evil.com")).toBe("/welcome")
      expect(getSafeCallbackUrl("http://attacker.com/steal")).toBe("/welcome")
      expect(getSafeCallbackUrl("ftp://files.example.com")).toBe("/welcome")
    })

    it("rejects protocol-relative URLs", () => {
      expect(getSafeCallbackUrl("//evil.com")).toBe("/welcome")
      expect(getSafeCallbackUrl("//evil.com/phishing")).toBe("/welcome")
      expect(getSafeCallbackUrl("///evil.com")).toBe("/welcome")
    })

    it("rejects backslash bypasses and WHATWG parser normalization exploits", () => {
      expect(getSafeCallbackUrl("/\\evil.com")).toBe("/welcome")
      expect(getSafeCallbackUrl("/\\attacker.com/steal")).toBe("/welcome")
      expect(getSafeCallbackUrl("\\evil.com")).toBe("/welcome")
      expect(getSafeCallbackUrl("/path\\with\\backslash")).toBe("/welcome")
    })

    it("rejects javascript: and data: pseudo-protocols", () => {
      expect(getSafeCallbackUrl("javascript:alert(1)")).toBe("/welcome")
      expect(getSafeCallbackUrl("data:text/html,<script>alert(1)</script>")).toBe("/welcome")
      expect(getSafeCallbackUrl("vbscript:msgbox(1)")).toBe("/welcome")
    })
  })
})
