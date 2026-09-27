import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { middleware } from "@/middleware"

describe("Middleware session gating and routing (AC-2, AC-8)", () => {
  const protectedRoutes = [
    "/welcome",
    "/about",
    "/automation",
    "/tools",
    "/team-invitation",
    "/launch",
  ]

  describe("Unauthenticated visitor protection (covers: AC-2)", () => {
    for (const route of protectedRoutes) {
      it(`redirects unauthenticated visitor from ${route} to login with callbackUrl`, () => {
        const request = new NextRequest(`http://localhost:3000${route}`)
        const response = middleware(request)

        expect(response.status).toBe(307)
        const location = response.headers.get("location")
        expect(location).toContain("/login?callbackUrl=")
        expect(location).toContain(encodeURIComponent(route))
      })
    }

    it("preserves nested query parameters in the callbackUrl", () => {
      const request = new NextRequest("http://localhost:3000/welcome?step=1&referral=test")
      const response = middleware(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("location")
      expect(location).toContain(encodeURIComponent("/welcome?step=1&referral=test"))
    })

    it("allows unauthenticated visitor to access /login without redirect", () => {
      const request = new NextRequest("http://localhost:3000/login")
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })

    it("allows unauthenticated visitor to access root / without redirect", () => {
      const request = new NextRequest("http://localhost:3000/")
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })
  })

  describe("Authenticated visitor routing (covers: AC-8)", () => {
    const validToken = "sample-valid-session-token-12345"

    it("allows authenticated request with better-auth.session_token into /welcome", () => {
      const request = new NextRequest("http://localhost:3000/welcome", {
        headers: {
          cookie: `better-auth.session_token=${validToken}`,
        },
      })
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })

    it("allows authenticated request with __Secure-better-auth.session_token into /welcome", () => {
      const request = new NextRequest("http://localhost:3000/welcome", {
        headers: {
          cookie: `__Secure-better-auth.session_token=${validToken}`,
        },
      })
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })

    it("passes authenticated visitor on /login through for Server Component resume handling", () => {
      const request = new NextRequest("http://localhost:3000/login", {
        headers: {
          cookie: `better-auth.session_token=${validToken}`,
        },
      })
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })

    it("passes authenticated visitor on root / through for Server Component resume handling", () => {
      const request = new NextRequest("http://localhost:3000/", {
        headers: {
          cookie: `better-auth.session_token=${validToken}`,
        },
      })
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("location")).toBeNull()
    })

    it("overwrites any client-supplied x-pathname header with the real server-parsed request pathname", () => {
      const request = new NextRequest("http://localhost:3000/automation", {
        headers: {
          cookie: `better-auth.session_token=${validToken}`,
          "x-pathname": "/evil-injected-path",
        },
      })
      const response = middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/automation")
    })
  })
})
