// src/workflows/engine.ts
import { PrismaClient, UserRole, WorkflowState } from "@prisma/client";

const prisma = new PrismaClient();

type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT";

function assertRole(role: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(role)) {
    const msg = `Forbidden: role=${role} not in [${allowed.join(", ")}]`;
    const err = new Error(msg);
    (err as any).statusCode = 403;
    throw err;
  }
}

function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  const allowed: Record<WorkflowState, WorkflowState[]> = {
    DRAFT: ["IN_REVIEW", "ARCHIVED"],
    IN_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
    CHANGES_REQUESTED: ["IN_REVIEW", "ARCHIVED"],
    APPROVED: ["PUBLISHED", "ARCHIVED"],
    PUBLISHED: ["ARCHIVED"],
    ARCHIVED: [],
    REJECTED: ["ARCHIVED"],
  };
  return allowed[from]?.includes(to) ?? false;
}

export async function submitForReview(params: {
  contentId: string;
  actorId: string;
}) {
  const { contentId, actorId } = params;

  const actor = await prisma.user.findUniqueOrThrow({ where: { id: actorId } });
  assertRole(actor.role, ["ADMIN", "EDITOR", "ANALYST"]);

  const wf = await prisma.workflow.upsert({
    where: { contentId },
    create: { contentId, state: "IN_REVIEW" },
    update: { state: "IN_REVIEW" },
    include: { content: true },
  });

  if (!canTransition(wf.content.state, "IN_REVIEW")) {
    throw new Error(`Invalid transition: ${wf.content.state} -> IN_REVIEW`);
  }

  await prisma.$transaction([
    prisma.contentItem.update({
      where: { id: contentId },
      data: { state: "IN_REVIEW", version: { increment: 1 } },
    }),
    prisma.workflow.update({
      where: { id: wf.id },
      data: { state: "IN_REVIEW", lockedById: actorId, lockedAt: new Date() },
    }),
    prisma.workflowEvent.create({
      data: {
        workflowId: wf.id,
        actorId,
        fromState: wf.state,
        toState: "IN_REVIEW",
        reason: "Submitted for review",
      },
    }),
  ]);

  return { ok: true, workflowId: wf.id };
}

export async function recordReviewDecision(params: {
  workflowId: string;
  actorId: string;
  decision: Decision;
  notes?: string;
}) {
  const { workflowId, actorId, decision, notes } = params;

  const actor = await prisma.user.findUniqueOrThrow({ where: { id: actorId } });
  assertRole(actor.role, ["ADMIN", "REVIEWER", "EDITOR"]);

  const wf = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { content: true },
  });

  if (wf.state !== "IN_REVIEW") {
    throw new Error(`Workflow not in review. state=${wf.state}`);
  }

  const toState: WorkflowState =
    decision === "APPROVE"
      ? "APPROVED"
      : decision === "REQUEST_CHANGES"
      ? "CHANGES_REQUESTED"
      : "REJECTED";

  if (!canTransition(wf.state, toState) || !canTransition(wf.content.state, toState)) {
    throw new Error(`Invalid transition: ${wf.state}/${wf.content.state} -> ${toState}`);
  }

  await prisma.$transaction([
    prisma.workflowApproval.create({
      data: {
        workflowId,
        reviewerId: actorId,
        decision,
        notes,
      },
    }),
    prisma.workflow.update({
      where: { id: workflowId },
      data: {
        state: toState,
        lockedById: null,
        lockedAt: null,
      },
    }),
    prisma.contentItem.update({
      where: { id: wf.contentId },
      data: { state: toState },
    }),
    prisma.workflowEvent.create({
      data: {
        workflowId,
        actorId,
        fromState: wf.state,
        toState,
        reason: `Review decision: ${decision}`,
        meta: { notes },
      },
    }),
  ]);

  return { ok: true, toState };
}

export async function publishContent(params: {
  contentId: string;
  actorId: string;
}) {
  const { contentId, actorId } = params;

  const actor = await prisma.user.findUniqueOrThrow({ where: { id: actorId } });
  assertRole(actor.role, ["ADMIN", "EDITOR"]);

  const wf = await prisma.workflow.findUniqueOrThrow({
    where: { contentId },
    include: { content: true },
  });

  if (wf.content.state !== "APPROVED") {
    throw new Error(`Content must be APPROVED to publish. state=${wf.content.state}`);
  }

  if (!canTransition(wf.state, "PUBLISHED") || !canTransition(wf.content.state, "PUBLISHED")) {
    throw new Error(`Invalid transition to PUBLISHED`);
  }

  await prisma.$transaction([
    prisma.workflow.update({
      where: { id: wf.id },
      data: { state: "PUBLISHED" },
    }),
    prisma.contentItem.update({
      where: { id: contentId },
      data: { state: "PUBLISHED" },
    }),
    prisma.workflowEvent.create({
      data: {
        workflowId: wf.id,
        actorId,
        fromState: wf.state,
        toState: "PUBLISHED",
        reason: "Published",
      },
    }),
  ]);

  return { ok: true };
}
