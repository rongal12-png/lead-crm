import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import ProfileForm from "@/components/profile/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, language: true, createdAt: true },
  });

  if (!user) redirect("/login");

  return (
    <div>
      <Header title="פרופיל אישי" />
      <div className="p-6">
        <ProfileForm
          initial={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}
