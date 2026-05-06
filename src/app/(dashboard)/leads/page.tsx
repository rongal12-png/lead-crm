import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import LeadsListClient from "@/components/leads/LeadsListClient";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  const [leadTypes, pipelines, users] = await Promise.all([
    prisma.leadType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.pipeline.findMany({ include: { stages: { orderBy: { order: "asc" } } } }),
    isAdmin
      ? prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : [],
  ]);

  return (
    <div>
      <Header title="Leads" />
      <div className="p-6">
        <LeadsListClient
          leadTypes={leadTypes}
          pipelines={pipelines}
          agents={users}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
          initialSearch={searchParams.search}
        />
      </div>
    </div>
  );
}
