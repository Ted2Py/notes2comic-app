import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ComicEditor } from "@/components/comic/comic-editor";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

type Comic = typeof comics.$inferSelect;
type Panel = typeof panels.$inferSelect;


export default async function EditComicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
    with: {
      panels: {
        orderBy: (panels, { asc }) => [asc(panels.panelNumber)],
      },
    },
  });

  if (!comic) {
    redirect("/dashboard");
  }

  if (comic.userId !== session.user.id) {
    redirect("/dashboard");
  }

  // Type assertion: panels from Drizzle query are Panel[] but type is lost
  const typedComic = comic as Comic & { panels: Panel[] };

  return <ComicEditor comic={typedComic} />;
}
