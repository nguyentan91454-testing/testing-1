import { Prisma } from "@prisma/client";
import type { Prisma as PrismaTypes } from "@prisma/client";

export async function recordAdminChange(tx: PrismaTypes.TransactionClient, input: {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await tx.auditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entity: input.entity,
      ...(input.entityId === undefined ? {} : { entityId: input.entityId }),
      ...(input.before === undefined ? {} : { before: input.before === null ? Prisma.JsonNull : input.before as Prisma.InputJsonValue }),
      ...(input.after === undefined ? {} : { after: input.after === null ? Prisma.JsonNull : input.after as Prisma.InputJsonValue }),
    },
  });
}
