import { describe, it, expect } from "vitest"
import { db } from "@/lib/db/index"

describe("Database client singleton (AC-1, AC-2)", () => {
  it("exports a valid Prisma client instance with all seven models (AC-2, AC-3)", () => {
    expect(db).toBeDefined()
    expect(typeof db.$connect).toBe("function")
    expect(typeof db.$disconnect).toBe("function")

    // Verify all seven models from the data contract exist on the client
    expect(db.user).toBeDefined()
    expect(db.session).toBeDefined()
    expect(db.account).toBeDefined()
    expect(db.verification).toBeDefined()
    expect(db.organization).toBeDefined()
    expect(db.member).toBeDefined()
    expect(db.invitation).toBeDefined()
  })

  it("caches the client instance on globalThis in non production environments (AC-2)", () => {
    const globalObj = globalThis as unknown as { prismaGlobal?: unknown }
    expect(globalObj.prismaGlobal).toBeDefined()
    expect(globalObj.prismaGlobal).toBe(db)
  })

  it("reuses the cached instance instead of instantiating new connections (AC-2)", async () => {
    const moduleImport = await import("@/lib/db/index")
    expect(moduleImport.db).toBe(db)
    expect(moduleImport.default).toBe(db)
  })
})
