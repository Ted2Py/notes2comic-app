"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface GalleryGridProps {
  page: number;
  subject?: string | null;
  sort?: string | null;
}

export function GalleryGrid({ page, subject, sort }: GalleryGridProps) {
  const [comics, setComics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading gallery...</p>
      </div>
    );
  }

  if (comics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No public comics yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {comics.map((comic) => (
        <Card key={comic.id} className="overflow-hidden">
          <Link href={`/comics/${comic.id}`}>
            <CardContent className="p-0">
              {comic.panels?.[0]?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={comic.panels[0].imageUrl}
                  alt={comic.title}
                  className="w-full h-48 object-cover"
                />
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
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {comic.metadata?.likes || 0}
              </span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
