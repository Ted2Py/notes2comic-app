import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc, count, sql, and } from "drizzle-orm";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, comics, likes, comments } from "@/lib/schema";

interface ProfileStats {
  totalComics: number;
  publicComics: number;
  totalLikes: number;
  totalComments: number;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Fetch the profile user
  const profileUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!profileUser) {
    notFound();
  }

  // Fetch stats
  const stats: ProfileStats = {
    totalComics: 0,
    publicComics: 0,
    totalLikes: 0,
    totalComments: 0,
  };

  const comicsResult = await db
    .select({ count: count() })
    .from(comics)
    .where(eq(comics.userId, userId));
  stats.totalComics = comicsResult[0]?.count || 0;

  const publicComicsResult = await db
    .select({ count: count() })
    .from(comics)
    .where(and(eq(comics.userId, userId), eq(comics.isPublic, true)));
  stats.publicComics = publicComicsResult[0]?.count || 0;

  const likesResult = await db
    .select({ count: count() })
    .from(likes)
    .where(eq(likes.userId, userId));
  stats.totalLikes = likesResult[0]?.count || 0;

  const commentsResult = await db
    .select({ count: count() })
    .from(comments)
    .where(eq(comments.userId, userId));
  stats.totalComments = commentsResult[0]?.count || 0;

  // Calculate total likes received on user's comics
  const likesReceivedResult = await db
    .select({
      totalLikes: sql<number>`CAST(COALESCE(SUM(CAST(comics.metadata->>'likes' AS INTEGER)), 0) AS INTEGER)`,
    })
    .from(comics)
    .where(eq(comics.userId, userId));
  const totalLikesReceived = likesReceivedResult[0]?.totalLikes || 0;

  const isOwnProfile = session?.user.id === userId;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/gallery">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gallery
        </Link>
      </Button>

      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileUser.image || undefined} />
              <AvatarFallback className="text-2xl">
                {profileUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{profileUser.name}</h1>
              {profileUser.bio ? (
                <p className="text-muted-foreground mb-2">{profileUser.bio}</p>
              ) : (
                <p className="text-muted-foreground italic mb-2">No bio</p>
              )}
              <p className="text-muted-foreground mb-4">
                {isOwnProfile ? "This is your profile" : "Viewing public profile"}
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{stats.publicComics}</p>
                    <p className="text-sm text-muted-foreground">Public Comics</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{totalLikesReceived}</p>
                    <p className="text-sm text-muted-foreground">Likes Received</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalComments}</p>
                    <p className="text-sm text-muted-foreground">Comments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User's Public Comics */}
      <h2 className="text-2xl font-bold mb-6">Public Comics by {profileUser.name}</h2>

      <UserComicsGrid userId={userId} />
    </div>
  );
}

// Client component for fetching and displaying user's comics
async function UserComicsGrid({ userId }: { userId: string }) {
  const userComics = await db.query.comics.findMany({
    where: eq(comics.userId, userId),
    with: {
      panels: {
        orderBy: [desc(comics.createdAt)],
      },
    },
    orderBy: [desc(comics.createdAt)],
  });

  const publicComics = userComics.filter((c) => c.isPublic);

  if (publicComics.length === 0) {
    return (
      <Card>
        <CardContent className="p-16 text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h3 className="text-xl font-semibold mb-2">No public comics yet</h3>
          <p className="text-muted-foreground">
            This user hasn't shared any public comics yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {publicComics.map((comic) => (
        <Card key={comic.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <Link href={`/comics/${comic.id}`} className="relative block group">
            <CardContent className="p-0">
              {comic.panels?.[0]?.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={comic.panels[0].imageUrl}
                    alt={comic.title}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </>
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No preview</span>
                </div>
              )}
            </CardContent>
          </Link>
          <CardContent className="p-4">
            <Link href={`/comics/${comic.id}`}>
              <h3 className="font-semibold truncate mb-2">{comic.title}</h3>
            </Link>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{comic.metadata?.panelCount || 0} panels</span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {comic.metadata?.likes || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
