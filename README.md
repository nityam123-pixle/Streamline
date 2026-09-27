# Streamline

Streamline is an open source AI workflow automation platform designed for modern engineering and operations teams. Built with Next.js 16, React 19, Better Auth, and Neon Serverless PostgreSQL, Streamline delivers a fast, responsive user onboarding experience with reliable database persistence, route protection, and team invitation management.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-indigo)](https://www.prisma.io/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.7.6-emerald)](https://better-auth.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-cyan)](https://tailwindcss.com/)

---

## Architectural Highlights

* **Authoritative Resume Routing**: Returning workspace owners are automatically redirected from `/` or `/login` directly to their latest incomplete onboarding step in a single hop.
* **Route Protection Barrier**: Server Component layouts verify session organization state against the requested path. Forward skips past unlocked steps are blocked, while backward navigation remains unlocked.
* **High Watermark Progression**: Modifying earlier onboarding forms (such as editing company details on step two) preserves furthest unlocked step access without resetting downstream configuration.
* **Multi Organization Scoping**: Resume state lookup scopes to the active session organization, gracefully falling back to initial workspace records when needed.
* **Cryptographic Team Invitations**: Pending member invitations use SHA-256 hashed invite tokens with support for role assignment and shareable organization join codes.
* **Strict Server Authority**: Identity is derived exclusively on the server from authenticated session cookies, never accepted from client inputs.
* **Zero Secret Exposure**: Public routes and client components receive only sanitized data through Zod schema validation.

---

## The Onboarding Flow

Streamline guides new workspace owners through an interactive six step setup journey:

1. **Welcome Overview (`/welcome`)**: Introduction to Streamline workspace capabilities and architecture setup.
2. **Workspace Profile (`/about`)**: Company name, team size, and owner profile configuration prefilled from registration.
3. **Automation Preferences (`/automation`)**: Workflow category selection covering Customer Support, Sales, Marketing, and Operations.
4. **Tool Integrations (`/tools`)**: Prebuilt connections for Slack, Google Drive, Notion, Gmail, and developer webhooks.
5. **Team Invitations (`/team-invitation`)**: Teammate invitations with role permissions or a shareable workspace link, with instant skip support.
6. **Launch Confirmation (`/launch`)**: Complete summary of selected configuration, member counts, and setup finalization.

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server Components, Server Actions, edge routing, and streaming layouts |
| **Frontend Library** | React 19 | UI component architecture and interactive hooks |
| **Language** | TypeScript 5 | Strict static typing across schemas, actions, and UI |
| **Database** | Neon Serverless PostgreSQL | Scalable relational storage with instant connection pooling |
| **ORM** | Prisma | Schema definitions, type safe client queries, and migrations |
| **Authentication** | Better Auth | Session management, password hashing, and organization plugin |
| **Styling** | Tailwind CSS | Utility first styling with responsive design tokens |
| **Motion** | Framer Motion | Smooth layout animations and step transition choreography |
| **UI Primitives** | Radix UI | Accessible headless primitives for avatars, checkboxes, and labels |
| **Icons** | Lucide React | Clean, scalable vector iconography |
| **Validation** | Zod | Runtime schema validation for forms, Server Actions, and environment variables |
| **Testing** | Vitest | Fast automated unit, integration, and security test suites |

---

## Getting Started

### Prerequisites

* Node.js 20 or higher
* npm 10 or higher
* A PostgreSQL database instance (Neon Serverless PostgreSQL recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/nityam123-pixle/Streamline.git
cd Streamline
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file by copying the template:

```bash
cp .env.example .env.local
```

Fill in your configuration:

```env
# Database connection strings (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://user:password@endpoint-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@endpoint.region.aws.neon.tech/neondb?sslmode=require"

# Better Auth configuration
BETTER_AUTH_SECRET="your-secure-32-character-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

### 4. Run Database Migrations

Generate the Prisma Client and apply migrations to your database:

```bash
npx prisma migrate dev
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Testing

Streamline uses Vitest for unit and integration testing. All tests run against verified database transactions and real request environments.

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Onboarding route protection and resume logic
npx vitest run tests/workspace/onboarding-routing.test.ts

# Middleware session gating and path forwarding
npx vitest run tests/auth/middleware.test.ts

# Setup summary and completion actions
npx vitest run tests/workspace/launch.test.ts

# Team invitation creation and token hashing
npx vitest run tests/workspace/team-invitation.test.ts
```

---

## Project Structure

```text
Streamline/
├── prisma/
│   └── schema.prisma            # Database schema definitions
├── public/                      # Static brand assets and SVG icons
├── src/
│   ├── actions/                 # Next.js Server Actions with Zod validation
│   │   ├── auth.ts              # Signup and registration actions
│   │   ├── workspace.ts         # Profile update actions
│   │   ├── automation.ts        # Automation preferences actions
│   │   ├── tools.ts             # Tool integration selection actions
│   │   ├── team-invitation.ts   # Teammate invitations actions
│   │   └── launch.ts            # Summary retrieval and completion actions
│   ├── app/                     # Next.js App Router routes and pages
│   │   ├── (onboarding)/        # Protected onboarding route group
│   │   │   ├── layout.tsx       # Authoritative Server Component route guard
│   │   │   ├── welcome/         # Step 1: Welcome screen
│   │   │   ├── about/           # Step 2: Profile configuration
│   │   │   ├── automation/      # Step 3: Automation options
│   │   │   ├── tools/           # Step 4: Tool connectors
│   │   │   ├── team-invitation/ # Step 5: Teammate invitations
│   │   │   └── launch/          # Step 6: Confirmation and completion
│   │   ├── api/auth/[...all]/   # Better Auth HTTP route handler
│   │   ├── login/               # Split screen authentication page
│   │   ├── page.tsx             # Root registration and resume entrypoint
│   │   └── layout.tsx           # Root document layout
│   ├── components/              # Modular UI components
│   │   ├── brand/               # Left panel branding and metrics
│   │   ├── form/                # Form inputs, buttons, and validation
│   │   └── onboarding/          # Step visual shells and transitions
│   ├── context/                 # Client side animation state providers
│   ├── lib/                     # Server helpers and singleton clients
│   │   ├── auth/                # Better Auth server and client setup
│   │   ├── db/                  # Prisma client singleton
│   │   └── onboarding/          # Step index and routing policy helpers
│   └── middleware.ts            # Edge middleware for path forwarding and session gating
├── tests/                       # Comprehensive Vitest test suites
├── LICENSE                      # MIT Open Source License
└── README.md                    # Project documentation
```

---

## Contributing

Contributions are welcome and appreciated. If you would like to contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m "feat: add new capability"`).
4. Verify all tests pass (`npm test`) and build succeeds (`npm run build`).
5. Push to your branch (`git push origin feature/my-feature`).
6. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).
