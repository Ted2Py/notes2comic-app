"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { Pagination } from "@/components/gallery/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/date";

interface GalleryGridProps {
  page: number;
  subject?: string | null;
  sort?: string | null;
  inputType?: string | null;
  pageSize?: string | null;
}

interface Comic {
  id: string;
  title: string;
  subject: string;
  userId: string;
  inputType: string;
  pageSize: string;
  metadata?: {
    panelCount?: number;
    likes?: number;
  };
  createdAt: string;
  panels: Array<{ imageUrl: string }>;
}

const INPUT_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  pdf: "PDF",
  image: "Image",
  video: "Video",
};

const PAGE_SIZE_LABELS: Record<string, string> = {
  letter: "Letter",
  a4: "A4",
  tabloid: "Tabloid",
  a3: "A3",
};

export function GalleryGrid({ page, subject, sort, inputType, pageSize }: GalleryGridProps) {
  const { data: session } = useSession();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [likedComics, setLikedComics] = useState<Set<string>>(new Set());

  const fetchGallery = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        sort: sort || "recent",
      });
      if (subject) params.append("subject", subject);
      if (inputType) params.append("inputType", inputType);
      if (pageSize) params.append("pageSize", pageSize);

      const response = await fetch(`/api/gallery?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setComics(data.comics || []);
        setPagination(data.pagination || { page: 1, totalPages: 1 });

        // Fetch like status for each comic
        const likePromises = (data.comics || []).map((comic: Comic) =>
          fetch(`/api/comics/${comic.id}/like`)
            .then((res) => res.json())
            .then((data) => ({ comicId: comic.id, isLiked: !!data.isLiked }))
            .catch(() => ({ comicId: comic.id, isLiked: false }))
        );

        const likeResults = await Promise.all(likePromises);
        const likedSet = new Set(
          likeResults.filter((r) => r.isLiked).map((r) => r.comicId)
        );
        setLikedComics(likedSet);
      }
    } catch (error) {
      console.error("Failed to fetch gallery:", error);
    } finally {
      setLoading(false);
    }
  }, [page, subject, sort, inputType, pageSize]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleLike = async (comicId: string, comicUserId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user is trying to like their own comic
    if (session?.user?.id === comicUserId) {
      toast("Can't like your own comic", {
        duration: 1500,
      });
      return;
    }

    const isLiked = likedComics.has(comicId);

    try {
      const response = await fetch(`/api/comics/${comicId}/like`, {
        method: isLiked ? "DELETE" : "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const newLikedComics = new Set(likedComics);

        if (isLiked) {
          newLikedComics.delete(comicId);
        } else {
          newLikedComics.add(comicId);
        }

        setLikedComics(newLikedComics);

        // Update like count in comics
        setComics((prev) =>
          prev.map((c) =>
            c.id === comicId
              ? { ...c, metadata: { ...c.metadata, likes: data.likes } }
              : c
          )
        );
      } else if (response.status === 401) {
        toast.error("Please log in to like comics", {
          duration: 2000,
        });
      } else if (response.status === 400) {
        const error = await response.json();
        toast.error(error.error || "Cannot like this comic", {
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast.error("Failed to update like", {
        duration: 2000,
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="w-full h-48" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (comics.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-xl font-semibold mb-2">No public comics yet</h3>
        <p className="text-muted-foreground mb-6">
          Be the first to share your comic with the community!
        </p>
        <Button asChild>
          <Link href="/create">Create Your First Comic</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comics.map((comic) => (
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
            <CardFooter className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between w-full gap-2">
                <Link href={`/comics/${comic.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{comic.title}</h3>
                </Link>
                <Badge variant="secondary" className="shrink-0">{comic.subject}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">
                  {INPUT_TYPE_LABELS[comic.inputType] || comic.inputType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {PAGE_SIZE_LABELS[comic.pageSize] || comic.pageSize}
                </Badge>
              </div>
              <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                <span>{comic.panels?.length || comic.metadata?.panelCount || 0} panels</span>
                <span>{formatRelativeTime(comic.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between w-full">
                <Link
                  href={`/profile/${comic.userId}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  View creator profile
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 gap-1 ${likedComics.has(comic.id) ? "text-red-500 hover:text-red-600" : "hover:text-red-400"}`}
                  onClick={(e) => handleLike(comic.id, comic.userId, e)}
                >
                  <Heart className={`h-4 w-4 ${likedComics.has(comic.id) ? "fill-current" : ""}`} />
                  {comic.metadata?.likes || 0}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {comics.length > 0 && (
        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} />
      )}
    </>
  );
}
