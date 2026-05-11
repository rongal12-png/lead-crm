import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import InboxClient from "@/components/inbox/InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    where: { status: "active", id: { not: session.user.id } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Header title="הודעות פנימיות" />
      <div className="p-6">
        <InboxClient
          currentUserId={session.user.id}
          currentUserName={session.user.name ?? ""}
          users={users}
        />
      </div>
    </div>
  );
}
