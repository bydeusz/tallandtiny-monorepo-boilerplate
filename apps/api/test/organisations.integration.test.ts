import { prisma } from "@repo/database";
import { afterAll, describe, expect, it } from "vitest";

async function makeUser(tag: string) {
  return prisma.user.create({
    data: {
      name: "Test",
      surname: tag,
      email: `org-${tag}-${Date.now()}@example.com`,
      password: "hashed",
    },
  });
}

describe("Organisation persistence (integration)", () => {
  it("creates an organisation with an OWNER membership", async () => {
    const user = await makeUser("owner");
    const org = await prisma.organisation.create({ data: { name: "Acme" } });
    const member = await prisma.organisationMember.create({
      data: { userId: user.id, organisationId: org.id, role: "OWNER" },
    });

    expect(member.role).toBe("OWNER");
  });

  it("rejects a duplicate (userId, organisationId) membership", async () => {
    const user = await makeUser("dup");
    const org = await prisma.organisation.create({ data: { name: "Dup Inc" } });
    await prisma.organisationMember.create({
      data: { userId: user.id, organisationId: org.id, role: "MEMBER" },
    });

    await expect(
      prisma.organisationMember.create({
        data: { userId: user.id, organisationId: org.id, role: "MEMBER" },
      }),
    ).rejects.toThrow();
  });

  it("cascades membership deletion when the organisation is deleted", async () => {
    const user = await makeUser("cascade");
    const org = await prisma.organisation.create({ data: { name: "Gone Ltd" } });
    await prisma.organisationMember.create({
      data: { userId: user.id, organisationId: org.id, role: "OWNER" },
    });

    await prisma.organisation.delete({ where: { id: org.id } });

    const remaining = await prisma.organisationMember.findMany({
      where: { organisationId: org.id },
    });
    expect(remaining).toHaveLength(0);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
