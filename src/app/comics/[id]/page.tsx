import { headers } from "next/headers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { ArrowLeft, Edit } from "lucide-react";
import { ComicStripView } from "@/components/comic/comic-strip-view";
import { ExportButton } from "@/components/comic/export-button";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels } from "@/lib/schema";

export default async function ComicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
    with: {
      panels: {
        orderBy: [asc(panels.panelNumber)],
      },
    },
  });

  if (!comic) {
    notFound();
  }

  if (comic.userId !== session.user.id && !comic.isPublic) {
    redirect("/dashboard");
  }

  const isOwner = comic.userId === session.user.id;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={isOwner ? "/dashboard" : "/gallery"}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{comic.title}</h1>
            {comic.description && (
              <p className="text-muted-foreground">{comic.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && (
            <form action={async () => {
              "use server";
              await db.update(comics)
                .set({ isPublic: !comic.isPublic })
                .where(eq(comics.id, comic.id));
              redirect(`/comics/${comic.id}`);
            }}>
              <Button
                type="submit"
                variant={comic.isPublic ? "default" : "outline"}
                size="sm"
              >
                {comic.isPublic ? "🌐 Public" : "🔒 Private"}
              </Button>
            </form>
          )}
          <ExportButton comicId={comic.id} comicTitle={comic.title} outputFormat={comic.outputFormat} />
          {isOwner && (
            <Button asChild variant="outline">
              <Link href={`/comics/${comic.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <ComicStripView
        panels={comic.panels}
        outputFormat={comic.outputFormat}
        borderStyle={comic.borderStyle}
        showCaptions={comic.showCaptions}
      />
    </div>
  );
}
