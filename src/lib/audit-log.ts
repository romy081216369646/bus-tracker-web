import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type AuditLogInput = {
  action: string;
  entity: string;
  entityId?: string;
  status: "SUCCESS" | "FAILED";
  actorUserId?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Prisma.InputJsonValue;
};

export async function logAuditEvent(input: AuditLogInput) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      status: input.status,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: input.details,
    },
  });
}

export function getRequestMeta(request: Request | { headers: Headers }) {
  const requestHeaders = request.headers;
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    undefined;
  const userAgent = requestHeaders.get("user-agent") ?? undefined;

  return { ipAddress, userAgent };
}
