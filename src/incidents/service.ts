// src/incidents/service.ts
import { PrismaClient, IncidentSeverity, IncidentStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function forbid(msg: string) {
  const err = new Error(msg);
  (err as any).statusCode = 403;
  throw err;
}

export async function createIncident(params: {
  reporterId: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  runbookKey?: string;
}) {
  const reporter = await prisma.user.findUniqueOrThrow({ where: { id: params.reporterId } });

  // Typically: anyone internal can report, but you can tighten this.
  if (![UserRole.ADMIN, UserRole.EDITOR, UserRole.ANALYST, UserRole.INCIDENT_COMMANDER, UserRole.REVIEWER].includes(reporter.role)) {
    forbid("Insufficient role to create incident");
  }

  const incident = await prisma.incident.create({
    data: {
      title: params.title,
      summary: params.summary,
      severity: params.severity,
      status: "OPEN",
      reportedById: params.reporterId,
      ownerId: reporter.role === "INCIDENT_COMMANDER" ? reporter.id : null,
      runbookKey: params.runbookKey,
      timeline: {
        create: { message: "Incident created", meta: { severity: params.severity } },
      },
      updates: {
        create: { status: "OPEN", publicNote: "Investigating an issue", internalNote: params.summary },
      },
    },
    include: { timeline: true, updates: true },
  });

  // Hook point: page on-call, create Slack channel, update status page, etc.
  return { ok: true, incident };
}

export async function updateIncidentStatus(params: {
  actorId: string;
  incidentId: string;
  status: IncidentStatus;
  publicNote?: string;
  internalNote?: string;
}) {
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: params.actorId } });

  if (![UserRole.ADMIN, UserRole.INCIDENT_COMMANDER].includes(actor.role)) {
    forbid("Only ADMIN or INCIDENT_COMMANDER can update incident status");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findUniqueOrThrow({ where: { id: params.incidentId } });

    const incidentUpdate = await tx.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        status: params.status,
        publicNote: params.publicNote,
        internalNote: params.internalNote,
      },
    });

    const timeline = await tx.incidentEvent.create({
      data: {
        incidentId: incident.id,
        message: `Status -> ${params.status}`,
        meta: { publicNote: params.publicNote },
      },
    });

    const timePatch: any = {};
    if (params.status === "MITIGATING") timePatch.mitigatedAt = new Date();
    if (params.status === "RESOLVED") timePatch.resolvedAt = new Date();
    if (params.status === "CLOSED") timePatch.closedAt = new Date();

    const incidentPatched = await tx.incident.update({
      where: { id: incident.id },
      data: { status: params.status, ownerId: incident.ownerId ?? actor.id, ...timePatch },
    });

    return { incident: incidentPatched, incidentUpdate, timeline };
  });

  return { ok: true, ...updated };
}
