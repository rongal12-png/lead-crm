import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const hashedPassword = await bcrypt.hash("Admin1234!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@crm.com",
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@crm.com" },
    update: {},
    create: {
      name: "Sales Manager",
      email: "manager@crm.com",
      password: hashedPassword,
      role: UserRole.MANAGER,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@crm.com" },
    update: {},
    create: {
      name: "Sales Agent",
      email: "agent@crm.com",
      password: hashedPassword,
      role: UserRole.AGENT,
    },
  });

  console.log("✅ Users created");

  // VC Pipeline
  const vcPipeline = await prisma.pipeline.upsert({
    where: { id: "pipeline-vc" },
    update: {},
    create: {
      id: "pipeline-vc",
      name: "VC Pipeline",
      description: "Pipeline for Venture Capital investors",
      isDefault: true,
    },
  });

  const vcStages = [
    { name: "New Lead", order: 1, probability: 5, color: "#94a3b8" },
    { name: "Qualified", order: 2, probability: 15, color: "#60a5fa" },
    { name: "Intro Sent", order: 3, probability: 20, color: "#818cf8" },
    { name: "First Call Scheduled", order: 4, probability: 25, color: "#a78bfa" },
    { name: "First Call Completed", order: 5, probability: 35, color: "#c084fc" },
    { name: "Deck Sent", order: 6, probability: 45, color: "#e879f9" },
    { name: "Due Diligence", order: 7, probability: 55, color: "#f472b6" },
    { name: "IC Review", order: 8, probability: 65, color: "#fb923c" },
    { name: "Soft Commit", order: 9, probability: 75, color: "#facc15" },
    { name: "Docs Sent", order: 10, probability: 85, color: "#a3e635" },
    { name: "Signed", order: 11, probability: 95, color: "#4ade80", isWon: false },
    { name: "Closed Won", order: 12, probability: 100, color: "#22c55e", isWon: true },
    { name: "Closed Lost", order: 13, probability: 0, color: "#ef4444", isLost: true },
    { name: "Nurture", order: 14, probability: 10, color: "#6b7280" },
  ];

  for (const stageData of vcStages) {
    await prisma.stage.upsert({
      where: { id: `stage-vc-${stageData.order}` },
      update: {},
      create: {
        id: `stage-vc-${stageData.order}`,
        pipelineId: vcPipeline.id,
        ...stageData,
      },
    });
  }

  // Leader Pipeline
  const leaderPipeline = await prisma.pipeline.upsert({
    where: { id: "pipeline-leader" },
    update: {},
    create: {
      id: "pipeline-leader",
      name: "Leader Pipeline",
      description: "Pipeline for leaders who refer buyers",
    },
  });

  const leaderStages = [
    { name: "New Leader", order: 1, probability: 10, color: "#94a3b8" },
    { name: "Background Check", order: 2, probability: 20, color: "#60a5fa" },
    { name: "Intro Call", order: 3, probability: 30, color: "#818cf8" },
    { name: "Terms Discussed", order: 4, probability: 50, color: "#a78bfa" },
    { name: "Approved", order: 5, probability: 70, color: "#facc15" },
    { name: "Active", order: 6, probability: 80, color: "#4ade80" },
    { name: "High Performer", order: 7, probability: 90, color: "#22c55e" },
    { name: "Paused", order: 8, probability: 20, color: "#fb923c" },
    { name: "Closed", order: 9, probability: 0, color: "#ef4444", isLost: true },
  ];

  for (const stageData of leaderStages) {
    await prisma.stage.upsert({
      where: { id: `stage-leader-${stageData.order}` },
      update: {},
      create: {
        id: `stage-leader-${stageData.order}`,
        pipelineId: leaderPipeline.id,
        ...stageData,
      },
    });
  }

  // Purchaser Pipeline
  const purchaserPipeline = await prisma.pipeline.upsert({
    where: { id: "pipeline-purchaser" },
    update: {},
    create: {
      id: "pipeline-purchaser",
      name: "Purchaser Pipeline",
      description: "Pipeline for buyers and purchasers",
    },
  });

  const purchaserStages = [
    { name: "New Lead", order: 1, probability: 5, color: "#94a3b8" },
    { name: "Contacted", order: 2, probability: 15, color: "#60a5fa" },
    { name: "Interested", order: 3, probability: 25, color: "#818cf8" },
    { name: "Qualified", order: 4, probability: 35, color: "#a78bfa" },
    { name: "Pitch Sent", order: 5, probability: 45, color: "#c084fc" },
    { name: "Follow-up Needed", order: 6, probability: 40, color: "#fb923c" },
    { name: "Soft Commit", order: 7, probability: 65, color: "#facc15" },
    { name: "KYC / Docs", order: 8, probability: 75, color: "#a3e635" },
    { name: "Payment Pending", order: 9, probability: 85, color: "#4ade80" },
    { name: "Closed Won", order: 10, probability: 100, color: "#22c55e", isWon: true },
    { name: "Lost", order: 11, probability: 0, color: "#ef4444", isLost: true },
    { name: "Future Potential", order: 12, probability: 15, color: "#6b7280" },
  ];

  for (const stageData of purchaserStages) {
    await prisma.stage.upsert({
      where: { id: `stage-purchaser-${stageData.order}` },
      update: {},
      create: {
        id: `stage-purchaser-${stageData.order}`,
        pipelineId: purchaserPipeline.id,
        ...stageData,
      },
    });
  }

  console.log("✅ Pipelines and stages created");

  // Lead Types
  const vcType = await prisma.leadType.upsert({
    where: { name: "VC" },
    update: {},
    create: {
      name: "VC",
      description: "Venture Capital investors",
      defaultPipelineId: vcPipeline.id,
      color: "#6366f1",
    },
  });

  const leaderType = await prisma.leadType.upsert({
    where: { name: "Leader" },
    update: {},
    create: {
      name: "Leader",
      description: "Leaders who refer buyers",
      defaultPipelineId: leaderPipeline.id,
      color: "#8b5cf6",
    },
  });

  const purchaserType = await prisma.leadType.upsert({
    where: { name: "Purchaser" },
    update: {},
    create: {
      name: "Purchaser",
      description: "Buyers and purchasers",
      defaultPipelineId: purchaserPipeline.id,
      color: "#06b6d4",
    },
  });

  console.log("✅ Lead types created");

  // Custom fields for VC
  const vcFields = [
    { key: "fund_name", label: "Fund Name", fieldType: "TEXT" as const, order: 1 },
    { key: "investment_focus", label: "Investment Focus", fieldType: "TEXT" as const, order: 2 },
    { key: "fund_size", label: "Fund Size (USD)", fieldType: "CURRENCY" as const, order: 3 },
    { key: "typical_ticket", label: "Typical Ticket Size", fieldType: "CURRENCY" as const, order: 4 },
    { key: "preferred_stage", label: "Preferred Stage", fieldType: "SELECT" as const, options: ["Pre-Seed", "Seed", "Series A", "Series B+"], order: 5 },
    { key: "nda_status", label: "NDA Status", fieldType: "SELECT" as const, options: ["Not Sent", "Sent", "Signed"], order: 6 },
    { key: "dd_status", label: "Due Diligence Status", fieldType: "SELECT" as const, options: ["Not Started", "In Progress", "Completed"], order: 7 },
    { key: "investment_probability", label: "Investment Probability %", fieldType: "NUMBER" as const, order: 8 },
  ];

  for (const field of vcFields) {
    await prisma.customFieldDefinition.upsert({
      where: { leadTypeId_key: { leadTypeId: vcType.id, key: field.key } },
      update: {},
      create: {
        leadTypeId: vcType.id,
        ...field,
        options: field.options ? JSON.stringify(field.options) : null,
      },
    });
  }

  // Custom fields for Leader
  const leaderFields = [
    { key: "community", label: "Community / Network", fieldType: "TEXT" as const, order: 1 },
    { key: "channels", label: "Active Channels", fieldType: "TEXT" as const, order: 2 },
    { key: "commission_rate", label: "Commission Rate %", fieldType: "NUMBER" as const, order: 3 },
    { key: "agreement_status", label: "Agreement Status", fieldType: "SELECT" as const, options: ["Not Signed", "Pending", "Signed"], order: 4 },
    { key: "reliability_score", label: "Reliability Score", fieldType: "NUMBER" as const, order: 5 },
    { key: "leads_brought", label: "Leads Brought", fieldType: "NUMBER" as const, order: 6 },
  ];

  for (const field of leaderFields) {
    await prisma.customFieldDefinition.upsert({
      where: { leadTypeId_key: { leadTypeId: leaderType.id, key: field.key } },
      update: {},
      create: {
        leadTypeId: leaderType.id,
        ...field,
        options: field.options ? JSON.stringify(field.options) : null,
      },
    });
  }

  // Custom fields for Purchaser
  const purchaserFields = [
    { key: "kyc_status", label: "KYC Status", fieldType: "SELECT" as const, options: ["Not Started", "In Progress", "Approved", "Rejected"], order: 1 },
    { key: "wallet_address", label: "Wallet Address", fieldType: "TEXT" as const, order: 2, isSensitive: true },
    { key: "preferred_language", label: "Preferred Language", fieldType: "SELECT" as const, options: ["Hebrew", "English", "Russian", "French", "Other"], order: 3 },
    { key: "risk_notes", label: "Risk Notes", fieldType: "TEXT" as const, order: 4, isSensitive: true },
  ];

  for (const field of purchaserFields) {
    await prisma.customFieldDefinition.upsert({
      where: { leadTypeId_key: { leadTypeId: purchaserType.id, key: field.key } },
      update: {},
      create: {
        leadTypeId: purchaserType.id,
        ...field,
        options: field.options ? JSON.stringify(field.options) : null,
        isSensitive: (field as { isSensitive?: boolean }).isSensitive ?? false,
      },
    });
  }

  console.log("✅ Custom fields created");

  // Default automation rules
  await prisma.automationRule.upsert({
    where: { id: "auto-vc-deck-sent" },
    update: {},
    create: {
      id: "auto-vc-deck-sent",
      name: "Follow-up after deck sent",
      trigger: "stage_changed",
      conditions: { new_stage_name: "Deck Sent", lead_type: "VC" },
      actions: [
        { type: "create_task", title: "Follow up after deck sent", due_in_days: 2, task_type: "CALL" },
      ],
      isActive: true,
    },
  });

  await prisma.automationRule.upsert({
    where: { id: "auto-soft-commit" },
    update: {},
    create: {
      id: "auto-soft-commit",
      name: "Payment details after Soft Commit",
      trigger: "stage_changed",
      conditions: { new_stage_name: "Soft Commit" },
      actions: [
        { type: "create_task", title: "Send payment details", due_in_days: 1, task_type: "EMAIL" },
      ],
      isActive: true,
    },
  });

  console.log("✅ Automation rules created");

  // Sample leads
  const vcStage1 = await prisma.stage.findFirst({ where: { pipelineId: vcPipeline.id, order: 5 } });
  const purchaserStage1 = await prisma.stage.findFirst({ where: { pipelineId: purchaserPipeline.id, order: 3 } });

  await prisma.lead.upsert({
    where: { id: "sample-lead-1" },
    update: {},
    create: {
      id: "sample-lead-1",
      displayName: "Daniel Cohen",
      firstName: "Daniel",
      lastName: "Cohen",
      companyName: "Alpha Ventures",
      email: "daniel@alphaventures.com",
      country: "US",
      source: "Referral",
      leadTypeId: vcType.id,
      pipelineId: vcPipeline.id,
      stageId: vcStage1?.id,
      ownerId: agent.id,
      createdBy: admin.id,
      potentialAmount: 250000,
      currency: "USD",
      probability: 35,
      aiScore: 72,
      priority: "HIGH",
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: ["Web3", "interested"],
    },
  });

  await prisma.lead.upsert({
    where: { id: "sample-lead-2" },
    update: {},
    create: {
      id: "sample-lead-2",
      displayName: "Yossi Levy",
      firstName: "Yossi",
      lastName: "Levy",
      email: "yossi@gmail.com",
      phone: "+972501234567",
      country: "IL",
      source: "Website",
      leadTypeId: purchaserType.id,
      pipelineId: purchaserPipeline.id,
      stageId: purchaserStage1?.id,
      ownerId: agent.id,
      createdBy: agent.id,
      potentialAmount: 20000,
      committedAmount: 20000,
      currency: "USD",
      probability: 65,
      aiScore: 85,
      priority: "URGENT",
      nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      tags: ["hot", "committed"],
    },
  });

  console.log("✅ Sample leads created");
  console.log("\n🎉 Seeding complete!");
  console.log("\n📧 Login credentials:");
  console.log("   Admin: admin@crm.com / Admin1234!");
  console.log("   Manager: manager@crm.com / Admin1234!");
  console.log("   Agent: agent@crm.com / Admin1234!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
