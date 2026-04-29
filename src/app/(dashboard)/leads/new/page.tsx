import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import NewLeadForm from "@/components/leads/NewLeadForm";

export default async function NewLeadPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const [leadTypes, pipelines, agents] = await Promise.all([
    prisma.leadType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.pipeline.findMany({ include: { stages: { orderBy: { order: "asc" } } } }),
    isManagerOrAdmin
      ? prisma.user.findMany({ select: { id: true, name: true }, where: { status: "active" }, orderBy: { name: "asc" } })
      : [],
  ]);

  return (
    <div>
      <Header title="New Lead" />
      <div className="p-6 max-w-2xl">
        <NewLeadForm
          leadTypes={leadTypes}
          pipelines={pipelines}
          agents={agents}
          currentUserId={session.user.id}
          isManagerOrAdmin={isManagerOrAdmin}
        />
      </div>
    </div>
  );
}
