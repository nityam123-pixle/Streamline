import { describe, it, expect, afterAll } from "vitest"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

describe("Better Auth Server Instance and API (AC-1, AC-4, AC-5, AC-6, AC-7)", () => {
  const createdUserIds: string[] = []
  const testRunId = Date.now()
  const testEmail = `auth-spec-${testRunId}@example.com`
  const testPassword = "ValidPassword123!"

  afterAll(async () => {
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe("Configuration and plugins (covers: AC-1)", () => {
    it("exports initialized Better Auth instance with plugins and settings", () => {
      expect(auth).toBeDefined()
      expect(auth.api).toBeDefined()
      expect(typeof auth.handler).toBe("function")
      expect(auth.options.emailAndPassword?.enabled).toBe(true)
      expect(auth.options.emailAndPassword?.minPasswordLength).toBe(8)
      expect(auth.options.rateLimit?.enabled).toBe(true)
      expect(auth.options.rateLimit?.max).toBe(10)
    })
  })

  describe("Registration and credential security (covers: AC-1, AC-4, AC-5)", () => {
    it("creates a new user and hashes password securely in database (covers: AC-4, AC-7)", async () => {
      const result = await auth.api.signUpEmail({
        body: {
          name: "Test Auth User",
          email: testEmail,
          password: testPassword,
        },
      })

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.id).toBeDefined()
      expect(result.user.email).toBe(testEmail)
      createdUserIds.push(result.user.id)

      // Verify in database that plaintext password is NOT stored
      const account = await db.account.findFirst({
        where: { userId: result.user.id },
      })
      expect(account).not.toBeNull()
      expect(account?.password).toBeDefined()
      expect(account?.password).not.toBe(testPassword)
    })

    it("rejects password shorter than 8 characters (covers: AC-5)", async () => {
      let errorThrown = false
      try {
        await auth.api.signUpEmail({
          body: {
            name: "Short Pw User",
            email: `short-${testRunId}@example.com`,
            password: "short",
          },
        })
      } catch {
        errorThrown = true
      }
      expect(errorThrown).toBe(true)
    })
  })

  describe("Authentication and session management (covers: AC-4, AC-5, AC-6)", () => {
    let sessionToken = ""
    let sessionCookie = ""

    it("rejects invalid password for existing user (covers: AC-5)", async () => {
      let invalidErrorCaught = false
      try {
        await auth.api.signInEmail({
          body: {
            email: testEmail,
            password: "CompletelyWrongPassword!",
          },
        })
      } catch {
        invalidErrorCaught = true
      }
      expect(invalidErrorCaught).toBe(true)
    })

    it("rejects non-existent email address (covers: AC-5)", async () => {
      let nonExistentCaught = false
      try {
        await auth.api.signInEmail({
          body: {
            email: `non-existent-${testRunId}@example.com`,
            password: "SomePassword123!",
          },
        })
      } catch {
        nonExistentCaught = true
      }
      expect(nonExistentCaught).toBe(true)
    })

    it("signs in successfully with correct credentials and returns session token (covers: AC-4)", async () => {
      const signInRes = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
        asResponse: true,
      })

      expect(signInRes.status).toBe(200)
      const setCookie = signInRes.headers.get("set-cookie")
      expect(setCookie).not.toBeNull()
      expect(setCookie).toContain("better-auth.session_token=")
      sessionCookie = setCookie || ""

      const data = await signInRes.json()
      expect(data).toBeDefined()
      expect(data.token).toBeDefined()
      expect(data.user.email).toBe(testEmail)
      sessionToken = data.token
    })

    it("retrieves active session via getSession with signed session cookie (covers: AC-4)", async () => {
      const sessionData = await auth.api.getSession({
        headers: new Headers({
          cookie: sessionCookie,
        }),
      })

      expect(sessionData).not.toBeNull()
      expect(sessionData?.session.token).toBe(sessionToken)
      expect(sessionData?.user.email).toBe(testEmail)
    })

    it("invalidates session in database upon sign out (covers: AC-6)", async () => {
      await auth.api.signOut({
        headers: new Headers({
          cookie: sessionCookie,
        }),
      })

      const sessionAfterSignOut = await auth.api.getSession({
        headers: new Headers({
          cookie: sessionCookie,
        }),
      })

      expect(sessionAfterSignOut).toBeNull()
    })
  })
})
