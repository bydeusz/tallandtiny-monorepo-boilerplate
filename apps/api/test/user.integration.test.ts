import { prisma } from "@repo/database";
import { afterAll, describe, expect, it } from "vitest";

describe("User persistence (integration)", () => {
  it("creates and reads back a user", async () => {
    const created = await prisma.user.create({
      data: {
        name: "Ada",
        surname: "Lovelace",
        email: `ada-${Date.now()}@example.com`,
        password: "hashed-password",
      },
    });

    const found = await prisma.user.findUnique({ where: { id: created.id } });

    expect(found?.email).toBe(created.email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
