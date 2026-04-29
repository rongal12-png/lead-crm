import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import KanbanBoard from "@/components/pipeline/KanbanBoard";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { pipelineId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const pipelines = await prisma.pipeline.findMany({
    include: {
      stages: { orderBy: { order: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  const selectedPipelineId = searchParams.pipelineId ?? pipelines[0]?.id;
  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId) ?? pipelines[0];

  const leads = selectedPipeline
    ? await prisma.lead.findMany({
        where: {
          pipelineId: selectedPipeline.id,
          status: "ACTIVE",
          ...(isManagerOrAdmin ? {} : { ownerId: session.user.id }),
        },
        include: {
          leadType: { select: { name: true, color: true } },
          owner: { select: { id: true, name: true } },
          stage: true,
          tasks: {
            where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
            select: { id: true },
          },
        },
        orderBy: { lastActivityAt: "desc" },
      })
    : [];

  return (
    <div className="h-screen flex flex-col">
      <Header title="Pipeline" />
      <div className="flex-1 overflow-hidden p-6 pb-0">
        <KanbanBoard
          pipelines={pipelines}
          selectedPipeline={JSON.parse(JSON.stringify(selectedPipeline ?? null))}
          leads={JSON.parse(JSON.stringify(leads))}
        />
      </div>
    </div>
  );
}
