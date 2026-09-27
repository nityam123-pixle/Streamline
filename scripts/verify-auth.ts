import { auth } from "../src/lib/auth/index"
import { middleware } from "../src/middleware"
import { NextRequest } from "next/server"

async function runAuthVerification() {
  console.log("Starting Auth and Session verification...")

  const testRunId = Date.now()
  const testEmail = `auth-test-${testRunId}@example.com`
  const testPassword = "SuperSecretPassword123!"

  // 1. Test Server Sign Up via Better Auth API
  console.log("Testing user sign up via Better Auth...")
  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: "Taylor Swift",
      email: testEmail,
      password: testPassword,
    },
  })

  if (!signUpResult.user || !signUpResult.user.id) {
    throw new Error("Failed to sign up user via Better Auth")
  }
  console.log(`Signed up user ${signUpResult.user.id} with email ${signUpResult.user.email}`)

  // 2. Test Server Sign In with Valid Credentials
  console.log("Testing user sign in with valid credentials...")
  const signInResult = await auth.api.signInEmail({
    body: {
      email: testEmail,
      password: testPassword,
    },
  })

  if (!signInResult.token || !signInResult.user) {
    throw new Error("Failed to sign in with valid credentials")
  }
  console.log(`Signed in successfully! Session token: ${signInResult.token.slice(0, 10)}...`)

  // 3. Test Sign In with Invalid Password (should fail)
  console.log("Testing user sign in with invalid password...")
  let invalidCaught = false
  try {
    await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: "WrongPassword456!",
      },
    })
  } catch (err: unknown) {
    invalidCaught = true
    console.log("Invalid credentials rejected as expected.")
  }

  if (!invalidCaught) {
    throw new Error("Failed to reject invalid password")
  }

  // 4. Test Middleware Session Gating for Unauthenticated User
  console.log("Testing middleware redirect for unauthenticated visitor to /welcome...")
  const unauthRequest = new NextRequest("http://localhost:3000/welcome")
  const unauthResponse = middleware(unauthRequest)

  if (unauthResponse.status !== 307 && unauthResponse.status !== 302 && unauthResponse.status !== 308) {
    throw new Error(`Expected redirect status from middleware, got ${unauthResponse.status}`)
  }

  const redirectLocation = unauthResponse.headers.get("location")
  console.log(`Redirect location for unauthenticated visitor: ${redirectLocation}`)
  if (!redirectLocation || !redirectLocation.includes("/login?callbackUrl=%2Fwelcome")) {
    throw new Error(`Unexpected redirect location: ${redirectLocation}`)
  }
  console.log("Unauthenticated request redirected to login with callbackUrl as expected.")

  // 5. Test Middleware for Authenticated User accessing /welcome
  console.log("Testing middleware for authenticated user accessing /welcome...")
  const authRequest = new NextRequest("http://localhost:3000/welcome", {
    headers: {
      cookie: `better-auth.session_token=${signInResult.token}`,
    },
  })
  const authResponse = middleware(authRequest)
  if (authResponse.status !== 200) {
    throw new Error(`Expected 200/next for authenticated user, got status ${authResponse.status}`)
  }
  console.log("Authenticated request permitted to proceed to /welcome.")

  // 6. Test Middleware for Authenticated User accessing /login (should redirect to /welcome)
  console.log("Testing middleware redirect for authenticated user accessing /login...")
  const authLoginRequest = new NextRequest("http://localhost:3000/login", {
    headers: {
      cookie: `better-auth.session_token=${signInResult.token}`,
    },
  })
  const authLoginResponse = middleware(authLoginRequest)
  const authLoginLocation = authLoginResponse.headers.get("location")
  if (!authLoginLocation || !authLoginLocation.endsWith("/welcome")) {
    throw new Error(`Expected redirect to /welcome, got ${authLoginLocation}`)
  }
  console.log("Authenticated user accessing /login redirected to /welcome as expected.")

  // 7. Test Session Invalidation / Sign Out
  console.log("Testing sign out and session invalidation...")
  await auth.api.signOut({
    headers: new Headers({
      cookie: `better-auth.session_token=${signInResult.token}`,
    }),
  })

  // Verify session is invalidated
  const sessionAfterSignOut = await auth.api.getSession({
    headers: new Headers({
      cookie: `better-auth.session_token=${signInResult.token}`,
    }),
  })

  if (sessionAfterSignOut !== null) {
    throw new Error("Session remained active after sign out")
  }
  console.log("Session token successfully invalidated upon sign out.")

  console.log("All Auth and Session verification checks passed cleanly!")
}

runAuthVerification()
  .catch((err) => {
    console.error("Auth verification failed:", err)
    process.exit(1)
  })
