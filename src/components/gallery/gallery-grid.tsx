"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
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
}

export function GalleryGrid({ page, subject, sort }: GalleryGridProps) {
  const [comics, setComics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetchGallery = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        sort: sort || "recent",
      });
      if (subject) params.append("subject", subject);

      const response = await fetch(`/api/gallery?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setComics(data.comics || []);
        setPagination(data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (error) {
      console.error("Failed to fetch gallery:", error);
    } finally {
      setLoading(false);
    }
  }, [page, subject, sort]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

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
              <div className="flex items-center justify-between w-full">
                <Link href={`/comics/${comic.id}`} className="flex-1">
                  <h3 className="font-semibold truncate">{comic.title}</h3>
                </Link>
                <Badge variant="outline">{comic.subject}</Badge>
              </div>
              <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                <span>{comic.metadata?.panelCount || 0} panels</span>
                <span>{formatRelativeTime(comic.createdAt)}</span>
              </div>
              <div className="flex items-center justify-end w-full text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {comic.metadata?.likes || 0}
                </span>
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
