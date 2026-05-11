import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import KaiTermsEditor from "@/components/kai-terms/KaiTermsEditor";
import {
  DEFAULT_KAI_TERMS_CONTENT,
  DEFAULT_KAI_TERMS_TITLE,
} from "@/lib/kai-terms-default";

export const dynamic = "force-dynamic";

export default async function KaiTermsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let doc = await prisma.kaiTerms.findUnique({ where: { slug: "default" } });
  if (!doc) {
    doc = await prisma.kaiTerms.create({
      data: {
        slug: "default",
        title: DEFAULT_KAI_TERMS_TITLE,
        content: DEFAULT_KAI_TERMS_CONTENT,
      },
    });
  }

  return (
    <div>
      <Header title="Kai — תנאי גיוס" />
      <div className="p-6">
        <KaiTermsEditor
          initial={{
            id: doc.id,
            title: doc.title,
            content: doc.content,
            version: doc.version,
            updatedAt: doc.updatedAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}
