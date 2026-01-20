import { headers } from "next/headers";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { ArrowLeft, Edit, Heart, MessageCircle } from "lucide-react";
import { ComicComments } from "@/components/comic/comic-comments";
import { ComicStripView } from "@/components/comic/comic-strip-view";
import { ExportButton } from "@/components/comic/export-button";
import { LikeButton } from "@/components/comic/like-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comics, panels, likes } from "@/lib/schema";

export default async function ComicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Allow public viewing without login
  const comic = await db.query.comics.findFirst({
    where: eq(comics.id, id),
    with: {
      panels: {
        orderBy: [asc(panels.panelNumber)],
      },
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          bio: true,
        },
      },
    },
  });

  if (!comic) {
    notFound();
  }

  // Require login for private comics
  if (!comic.isPublic && (!session || comic.userId !== session.user.id)) {
    redirect("/login");
  }

  const isOwner = session?.user.id === comic.userId;

  // Fetch like count
  const comicLikes = await db.query.likes.findMany({
    where: eq(likes.comicId, id),
  });
  const totalLikes = comicLikes.length;

  // Check if current user has liked
  let initialLiked = false;
  if (session) {
    initialLiked = comicLikes.some((like) => like.userId === session.user.id);
  }

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
          <ExportButton comicId={comic.id} comicTitle={comic.title} />
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

      {/* Creator Info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Link href={`/profile/${comic.user.id}`} className="shrink-0">
              <Avatar className="h-14 w-14">
                <AvatarImage src={comic.user.image || undefined} />
                <AvatarFallback className="text-lg">
                  {comic.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${comic.user.id}`}
                  className="font-semibold hover:underline"
                >
                  {comic.user.name}
                </Link>
                {comic.user.bio && (
                  <span className="text-sm text-muted-foreground">· {comic.user.bio}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isOwner ? "Created by you" : "Creator"}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/profile/${comic.user.id}`}>
                View Profile
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm mt-4">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span className="font-medium">{totalLikes} likes</span>
            </div>
            <Badge variant="outline">{comic.subject}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Comic View */}
      <ComicStripView
        panels={comic.panels}
        outputFormat={comic.outputFormat}
        borderStyle={comic.borderStyle}
        showCaptions={comic.showCaptions}
      />

      {/* Like Button */}
      <div className="mt-6 flex justify-center">
        <LikeButton comicId={comic.id} comicUserId={comic.userId} initialLiked={initialLiked} initialLikes={totalLikes} />
      </div>

      {/* Comments Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Comments
        </h2>
        <ComicComments comicId={comic.id} />
      </div>
    </div>
  );
}
