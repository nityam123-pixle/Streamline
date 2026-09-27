async function testHttpFlow() {
  const baseUrl = "http://localhost:3000"
  console.log(`Starting HTTP verification against ${baseUrl}...`)

  const testEmail = `http-test-${Date.now()}@example.com`
  const testPassword = "ValidPassword123!"

  // 1. Unauthenticated route protection
  console.log("Checking unauthenticated redirect for /welcome...")
  const unauthRes = await fetch(`${baseUrl}/welcome`, { redirect: "manual" })
  if (unauthRes.status !== 307) {
    throw new Error(`Expected 307 for unauthenticated /welcome, got ${unauthRes.status}`)
  }
  const location = unauthRes.headers.get("location")
  if (!location || !location.includes("/login?callbackUrl=%2Fwelcome")) {
    throw new Error(`Expected location to include /login?callbackUrl=%2Fwelcome, got ${location}`)
  }
  console.log(`PASS: Unauthenticated redirect returned ${unauthRes.status} to ${location}`)

  // 2. Login page HTML check
  console.log("Checking /login page structure...")
  const loginRes = await fetch(`${baseUrl}/login`)
  if (loginRes.status !== 200) {
    throw new Error(`Expected 200 for /login, got ${loginRes.status}`)
  }
  const loginHtml = await loginRes.text()
  if (!loginHtml.includes("Automate smarter.") || !loginHtml.includes("Scale faster.")) {
    throw new Error("Login page HTML missing branding copy")
  }
  console.log("PASS: Login page returns 200 with split screen branding content")

  // 3. Register user via Better Auth API
  console.log("Creating test user via /api/auth/sign-up/email...")
  const signUpRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
    },
    body: JSON.stringify({
      name: "HTTP Test User",
      email: testEmail,
      password: testPassword,
    }),
  })
  if (!signUpRes.ok) {
    const errorBody = await signUpRes.text()
    throw new Error(`Failed to sign up test user: ${signUpRes.status} ${errorBody}`)
  }
  console.log("PASS: User created successfully")

  // 4. Test bad credentials rejection
  console.log("Testing sign in with invalid password...")
  const badSignInRes = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
    },
    body: JSON.stringify({
      email: testEmail,
      password: "WrongPassword123!",
    }),
  })
  if (badSignInRes.status !== 401 && badSignInRes.status !== 400) {
    throw new Error(`Expected 401 or 400 for bad password, got ${badSignInRes.status}`)
  }
  console.log(`PASS: Invalid credentials rejected with status ${badSignInRes.status}`)

  // 5. Test valid credentials sign in and extract session cookie
  console.log("Testing sign in with valid credentials...")
  const goodSignInRes = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  })
  if (!goodSignInRes.ok) {
    const errText = await goodSignInRes.text()
    throw new Error(`Expected 200 for good sign in, got ${goodSignInRes.status} ${errText}`)
  }

  const setCookieHeader = goodSignInRes.headers.get("set-cookie") || ""
  const tokenMatch = setCookieHeader.match(/better-auth\.session_token=([^;]+)/)
  if (!tokenMatch) {
    throw new Error(`Set-Cookie header missing better-auth.session_token: ${setCookieHeader}`)
  }
  const sessionToken = tokenMatch[1]
  const cookieHeader = `better-auth.session_token=${sessionToken}`
  console.log(`PASS: Sign in succeeded, session cookie obtained (${sessionToken.slice(0, 10)}...)`)

  // 6. Test authenticated request to protected route /welcome
  console.log("Testing authenticated request to /welcome...")
  const authWelcomeRes = await fetch(`${baseUrl}/welcome`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  })
  if (authWelcomeRes.status !== 200) {
    throw new Error(`Expected 200 for authenticated /welcome, got ${authWelcomeRes.status}`)
  }
  console.log("PASS: Authenticated request to /welcome succeeded with status 200")

  // 7. Test authenticated request to /login (should redirect to /welcome)
  console.log("Testing authenticated request to /login...")
  const authLoginRes = await fetch(`${baseUrl}/login`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  })
  if (authLoginRes.status !== 307) {
    throw new Error(`Expected 307 redirect for authenticated user on /login, got ${authLoginRes.status}`)
  }
  const authLoginLoc = authLoginRes.headers.get("location")
  if (!authLoginLoc || !authLoginLoc.endsWith("/welcome")) {
    throw new Error(`Expected redirect to /welcome, got ${authLoginLoc}`)
  }
  console.log(`PASS: Authenticated user on /login redirected to ${authLoginLoc}`)

  // 8. Test sign out
  console.log("Testing sign out...")
  const signOutRes = await fetch(`${baseUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      Origin: baseUrl,
    },
    body: JSON.stringify({}),
  })
  if (!signOutRes.ok) {
    throw new Error(`Sign out failed with status ${signOutRes.status}`)
  }

  const signOutCookieHeader = signOutRes.headers.get("set-cookie") || ""
  if (!signOutCookieHeader.includes("better-auth.session_token=; Max-Age=0")) {
    throw new Error(`Sign out did not instruct browser to delete session cookie: ${signOutCookieHeader}`)
  }
  console.log("PASS: Sign out API returned 200 with deletion Set-Cookie header")

  // 9. Verify get-session returns null for invalidated session
  console.log("Checking session status via get-session API after sign out...")
  const getSessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { Cookie: cookieHeader },
  })
  const sessionData = await getSessionRes.json()
  if (sessionData !== null) {
    throw new Error(`Expected session to be null after sign out, got ${JSON.stringify(sessionData)}`)
  }
  console.log("PASS: Session invalidated in database, get-session returned null")

  // 10. Verify request to /welcome after sign out (with deleted cookie) redirects to login
  console.log("Testing request to /welcome after cookie deletion...")
  const postSignOutRes = await fetch(`${baseUrl}/welcome`, {
    redirect: "manual",
  })
  if (postSignOutRes.status !== 307) {
    throw new Error(`Expected 307 after sign out, got ${postSignOutRes.status}`)
  }
  console.log("PASS: Unauthenticated visitor after sign out redirected to /login")

  console.log("\nAll HTTP verification checks passed successfully!")
}

testHttpFlow().catch((err) => {
  console.error("HTTP verification failed:", err)
  process.exit(1)
})
