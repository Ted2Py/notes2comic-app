"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Heart, MessageCircle } from "lucide-react";
import { ComicComments } from "@/components/comic/comic-comments";
import { ComicStripView } from "@/components/comic/comic-strip-view";
import { ExportButton } from "@/components/comic/export-button";
import { LikeButton } from "@/components/comic/like-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import type { panels } from "@/lib/schema";

type Panel = typeof panels.$inferSelect;

type Comic = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  artStyle: string;
  tone: string;
  isPublic: boolean;
  userId: string;
  outputFormat?: "strip" | "separate";
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy";
  showCaptions?: boolean;
  user: {
    id: string;
    name: string;
    image: string | null;
    bio: string | null;
  };
  panels: Panel[];
};

export default function ComicPage() {
  const { id } = useParams();
  const router = useRouter();
  const [comic, setComic] = useState<Comic | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);
  const [initialLiked, setInitialLiked] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        // Get session
        const sess = await authClient.getSession();
        setSession(sess?.data || null);

        // Fetch comic data
        const comicRes = await fetch(`/api/comics/${id}`);
        if (!comicRes.ok) {
          if (comicRes.status === 401 || comicRes.status === 404) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to load comic");
        }
        const comicData = await comicRes.json();
        setComic(comicData);

        // Fetch likes
        const likesRes = await fetch(`/api/comics/${id}/likes`);
        if (likesRes.ok) {
          const likesData = await likesRes.json();
          setTotalLikes(likesData.total || 0);
          setInitialLiked(likesData.liked || false);
        }
      } catch (error) {
        console.error("Failed to load comic:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, router]);

  async function toggleVisibility() {
    if (!comic) return;
    const res = await fetch(`/api/comics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !comic.isPublic }),
    });
    if (res.ok) {
      setComic({ ...comic, isPublic: !comic.isPublic });
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <p className="text-muted-foreground">Comic not found</p>
      </div>
    );
  }

  const isOwner = session?.user?.id === comic.userId;

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
            <Button
              onClick={toggleVisibility}
              variant={comic.isPublic ? "default" : "outline"}
              size="sm"
            >
              {comic.isPublic ? "🌐 Public" : "🔒 Private"}
            </Button>
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
        outputFormat={comic.outputFormat || "strip"}
        {...(comic.borderStyle && { borderStyle: comic.borderStyle })}
        {...(comic.showCaptions !== undefined && { showCaptions: comic.showCaptions })}
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
        <ComicComments comicId={comic.id} comicOwnerId={comic.userId} />
      </div>
    </div>
  );
}
