import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import LeadDetailClient from "@/components/leads/LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      leadType: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true } },
      stage: true,
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
      activities: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { occurredAt: "desc" },
        take: 50,
      },
      tasks: {
        include: { assignee: { select: { id: true, name: true, image: true } } },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      },
      aiInsights: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 5 },
      customValues: { include: { fieldDefinition: true } },
    },
  });

  if (!lead) notFound();

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && lead.ownerId !== session.user.id) notFound();

  const agents = isAdmin
    ? await prisma.user.findMany({ select: { id: true, name: true }, where: { status: "active" } })
    : [];

  return (
    <div>
      <Header title={lead.displayName} />
      <div className="p-6">
        <LeadDetailClient
          lead={JSON.parse(JSON.stringify(lead))}
          agents={agents}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
