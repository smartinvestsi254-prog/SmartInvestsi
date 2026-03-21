import { PrismaClient, DataUsagePurpose, IncidentSeverity, IncidentStatus, LicenseStatus, UserRole, WorkflowState } from "@prisma/client";
import { dbClient } from '../src/lib/db-client';

const prisma = dbClient.getClient();

async function upsertUser(params: { id: string; email: string; name: string; role: UserRole }) {
  return prisma.user.upsert({
    where: { email: params.email },
    update: { name: params.name, role: params.role },
    create: { id: params.id, email: params.email, name: params.name, role: params.role },
  });
}

async function main() {
  const admin = await upsertUser({ id: "user-admin", email: "admin@example.com", name: "Admin", role: "ADMIN" });
  const editor = await upsertUser({ id: "user-editor", email: "editor@example.com", name: "Editor", role: "EDITOR" });
  const reviewer = await upsertUser({ id: "user-reviewer", email: "reviewer@example.com", name: "Reviewer", role: "REVIEWER" });
  const analyst = await upsertUser({ id: "user-analyst", email: "analyst@example.com", name: "Analyst", role: "ANALYST" });
  const incidentCommander = await upsertUser({ id: "user-ic", email: "ic@example.com", name: "Incident Commander", role: "INCIDENT_COMMANDER" });

  const draftContent = await prisma.contentItem.upsert({
    where: { id: "content-draft" },
    update: { state: "DRAFT" },
    create: { id: "content-draft", state: "DRAFT", version: 1 },
  });

  const approvedContent = await prisma.contentItem.upsert({
    where: { id: "content-approved" },
    update: { state: "APPROVED" },
    create: { id: "content-approved", state: "APPROVED", version: 2 },
  });

  await prisma.workflow.upsert({
    where: { contentId: draftContent.id },
    update: { state: "DRAFT", lockedById: null, lockedAt: null },
    create: { id: "workflow-draft", contentId: draftContent.id, state: "DRAFT" },
  });

  await prisma.workflow.upsert({
    where: { contentId: approvedContent.id },
    update: { state: "APPROVED", lockedById: null, lockedAt: null },
    create: { id: "workflow-approved", contentId: approvedContent.id, state: "APPROVED" },
  });

  await prisma.workflowEvent.upsert({
    where: { id: "event-approved" },
    update: {},
    create: {
      id: "event-approved",
      workflowId: "workflow-approved",
      actorId: reviewer.id,
      fromState: WorkflowState.IN_REVIEW,
      toState: WorkflowState.APPROVED,
      reason: "Seeded approval",
      meta: { notes: "Approved in seed" },
    },
  });

  await prisma.workflowApproval.upsert({
    where: { id: "approval-approved" },
    update: {},
    create: {
      id: "approval-approved",
      workflowId: "workflow-approved",
      reviewerId: reviewer.id,
      decision: "APPROVE",
      notes: "Seeded approval",
    },
  });

  await prisma.workflowEvent.upsert({
    where: { id: "event-draft" },
    update: {},
    create: {
      id: "event-draft",
      workflowId: "workflow-draft",
      actorId: editor.id,
      fromState: WorkflowState.DRAFT,
      toState: WorkflowState.DRAFT,
      reason: "Seeded draft",
    },
  });

  await prisma.contentItem.update({
    where: { id: approvedContent.id },
    data: { updatedAt: new Date() },
  });

  const partner = await prisma.partner.upsert({
    where: { name: "Demo Data Partner" },
    update: {},
    create: { id: "partner-demo", name: "Demo Data Partner" },
  });

  const license = await prisma.dataLicense.upsert({
    where: { id: "license-demo" },
    update: { status: LicenseStatus.ACTIVE },
    create: {
      id: "license-demo",
      partnerId: partner.id,
      status: LicenseStatus.ACTIVE,
      allowedPurposes: [DataUsagePurpose.ANALYTICS, DataUsagePurpose.DISPLAY, DataUsagePurpose.INTERNAL],
      attributionRequired: true,
      attributionText: "Demo Data Partner — attribution required",
      allowRedistribution: false,
      rateLimitPerMin: 120,
      startDate: new Date(),
    },
  });

  await prisma.dataEntitlement.upsert({
    where: { id: "entitlement-market-data" },
    update: {},
    create: { id: "entitlement-market-data", licenseId: license.id, datasetKey: "market-data" },
  });

  await prisma.dataEntitlement.upsert({
    where: { id: "entitlement-risk-scores" },
    update: {},
    create: { id: "entitlement-risk-scores", licenseId: license.id, datasetKey: "risk-scores" },
  });

  await prisma.dataUsageLog.create({
    data: {
      licenseId: license.id,
      datasetKey: "market-data",
      purpose: DataUsagePurpose.ANALYTICS,
      actorUserId: analyst.id,
      ip: "127.0.0.1",
      userAgent: "seed-script",
      requestMeta: { source: "seed" },
    },
  });

  await prisma.incident.upsert({
    where: { id: "incident-demo" },
    update: {},
    create: {
      id: "incident-demo",
      title: "Demo API outage",
      summary: "Seeded incident for local testing",
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.OPEN,
      reportedById: admin.id,
      ownerId: incidentCommander.id,
      runbookKey: "api-outage",
      timeline: {
        create: { id: "incident-demo-timeline-1", message: "Incident created", meta: { source: "seed" } },
      },
      updates: {
        create: { id: "incident-demo-update-1", status: IncidentStatus.OPEN, publicNote: "Investigating", internalNote: "Seeded data" },
      },
    },
  });

  await prisma.diplomacyMission.upsert({
    where: { id: "mission-nairobi" },
    update: {},
    create: {
      id: "mission-nairobi",
      name: "Nairobi Headquarters",
      country: "Kenya",
      city: "Nairobi",
      region: "East Africa",
      type: "EMBASSY",
      status: "ACTIVE",
      focusArea: "Protocol and coordination",
    },
  });

  await prisma.diplomacyMission.upsert({
    where: { id: "mission-addis" },
    update: {},
    create: {
      id: "mission-addis",
      name: "African Union Mission",
      country: "Ethiopia",
      city: "Addis Ababa",
      region: "East Africa",
      type: "PERMANENT_MISSION",
      status: "ACTIVE",
      focusArea: "Multilateral coordination",
    },
  });

  await prisma.diplomacyTreaty.upsert({
    where: { id: "treaty-trade-uganda" },
    update: {},
    create: {
      id: "treaty-trade-uganda",
      title: "Cross Border Trade Facilitation",
      partner: "Uganda",
      sector: "Trade",
      status: "RATIFIED",
      nextMilestone: "Joint committee Q2",
      summary: "Regional customs and logistics coordination.",
    },
  });

  await prisma.diplomacyTreaty.upsert({
    where: { id: "treaty-climate-france" },
    update: {},
    create: {
      id: "treaty-climate-france",
      title: "Climate Adaptation Facility",
      partner: "France",
      sector: "Climate",
      status: "SIGNED",
      nextMilestone: "Funding release",
      summary: "Resilience financing and adaptation support.",
    },
  });

  await prisma.diplomacyDelegation.upsert({
    where: { id: "delegation-trade-mission" },
    update: {},
    create: {
      id: "delegation-trade-mission",
      name: "Regional Trade Mission",
      focus: "Logistics and regional manufacturing",
      hostCity: "Kigali",
      hostCountry: "Rwanda",
      leadMinistry: "Ministry of Trade",
      status: "CONFIRMED",
      startDate: new Date("2026-03-18T00:00:00Z"),
      endDate: new Date("2026-03-22T00:00:00Z"),
      objectives: "Promote cross-border manufacturing and logistics partnerships.",
    },
  });

  await prisma.diplomacyDelegation.upsert({
    where: { id: "delegation-climate" },
    update: {},
    create: {
      id: "delegation-climate",
      name: "Climate Finance Roundtable",
      focus: "Green financing and resilience",
      hostCity: "Nairobi",
      hostCountry: "Kenya",
      leadMinistry: "Climate Desk",
      status: "PLANNED",
      startDate: new Date("2026-04-04T00:00:00Z"),
      endDate: new Date("2026-04-05T00:00:00Z"),
      objectives: "Align donor commitments and finance flows.",
    },
  });

  await prisma.diplomacyDocument.upsert({
    where: { id: "doc-briefing-1" },
    update: {},
    create: {
      id: "doc-briefing-1",
      title: "Country Briefing Pack",
      category: "BRIEFING_NOTE",
      classification: "RESTRICTED",
      ownerDept: "Policy Planning",
      summary: "Overview of bilateral priorities and engagement notes.",
    },
  });

  await prisma.diplomacyDocument.upsert({
    where: { id: "doc-protocol-1" },
    update: {},
    create: {
      id: "doc-protocol-1",
      title: "Protocol Checklist",
      category: "PROTOCOL_GUIDE",
      classification: "RESTRICTED",
      ownerDept: "Protocol Office",
      summary: "Arrival, ceremony, and delegation hosting requirements.",
    },
  });

  console.log("✅ Seed data created. Users: admin@example.com, editor@example.com, reviewer@example.com, analyst@example.com, ic@example.com");
  console.log("   Workflows: content-draft (DRAFT), content-approved (APPROVED)");
  console.log("   License: license-demo for datasets market-data, risk-scores");
  console.log("   Diplomacy: missions, treaties, delegations, documents");

  // Fintech advancements seed data
  // UserProfiles
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: { riskTolerance: "CONSERVATIVE", investmentGoals: ["preservation"] },
    create: {
      userId: admin.id,
      riskTolerance: "CONSERVATIVE",
      investmentGoals: ["preservation"],
      preferences: { crypto: false, stocks: true, notifications: "weekly" }
    }
  });

  await prisma.userProfile.upsert({
    where: { userId: analyst.id },
    update: { riskTolerance: "AGGRESSIVE", investmentGoals: ["growth"] },
    create: {
      userId: analyst.id,
      riskTolerance: "AGGRESSIVE",
      investmentGoals: ["growth"],
      preferences: { crypto: true, stocks: true, notifications: "daily" }
    }
  });

  // Referrals
  await prisma.referral.upsert({
    where: { id: "referral-1" },
    update: {},
    create: {
      id: "referral-1",
      referrerId: analyst.id,
      refereeEmail: "newuser@example.com",
      status: "PENDING",
      rewardTier: "PREMIUM"
    }
  });

  await prisma.referral.upsert({
    where: { id: "referral-2" },
    update: {},
    create: {
      id: "referral-2",
      referrerId: admin.id,
      refereeEmail: "referred@example.com",
      status: "REWARDED",
      rewardTier: "ENTERPRISE",
      rewardUsed: true,
      completedAt: new Date()
    }
  });

  // SupportTickets
  await prisma.supportTicket.upsert({
    where: { id: "ticket-1" },
    update: {},
    create: {
      id: "ticket-1",
      userId: analyst.id,
      subject: "Crypto trading issue",
      description: "Order not executing - check integration",
      status: "OPEN",
      priority: "HIGH"
    }
  });

  await prisma.supportTicket.upsert({
    where: { id: "ticket-2" },
    update: {},
    create: {
      id: "ticket-2",
      userId: admin.id,
      subject: "Premium grant request",
      description: "Grant PREMIUM for testing",
      status: "RESOLVED",
      priority: "MEDIUM",
      adminId: admin.id,
      resolutionNotes: "Granted PREMIUM tier",
      autoGrantTier: "PREMIUM",
      npsScore: 9,
      resolvedAt: new Date()
    }
  });

  // Sample Portfolio (for consistency)
  const portfolio = await prisma.portfolio.upsert({
    where: { id: "portfolio-sample" },
    update: {},
    create: {
      id: "portfolio-sample",
      userEmail: analyst.email,
      name: "Aggressive Growth Portfolio",
      description: "High-risk crypto-heavy portfolio",
      currency: "USD",
      totalValue: 12500.50,
      cashBalance: 2500.00
    }
  });

  await prisma.holding.create({
    data: {
      id: "holding-btc",
      portfolioId: portfolio.id,
      symbol: "BTC",
      assetType: "CRYPTO",
      quantity: 0.25,
      averageCost: 45000,
      costBasis: 11250,
      currentPrice: 50000,
      marketValue: 12500,
      unrealizedGain: 1250,
      unrealizedGainPct: 11.11,
      allocation: 100
    }
  });

  console.log("   Fintech: UserProfiles, Referrals, SupportTickets, Sample Portfolio seeded");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
