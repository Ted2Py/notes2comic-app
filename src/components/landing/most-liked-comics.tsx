"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function MostLikedComics() {
  const [comics, setComics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMostLiked() {
      try {
        const response = await fetch("/api/gallery?sort=popular&limit=4");
        if (response.ok) {
          const data = await response.json();
          setComics(data.comics || []);
        }
      } catch (error) {
        console.error("Failed to fetch most liked comics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMostLiked();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading trending comics...</p>
      </div>
    );
  }

  if (comics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No public comics yet. Be the first to create and share one!</p>
        <Button variant="outline" size="lg" asChild>
          <Link href="/create">
            <Heart className="h-4 w-4 mr-2" />
            Create a Comic
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {comics.map((comic) => (
          <Card key={comic.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
            <Link href={`/comics/${comic.id}`}>
              <CardContent className="p-0">
                {comic.panels?.[0]?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comic.panels[0].imageUrl}
                    alt={comic.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
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
                  <h3 className="font-semibold truncate hover:text-primary transition-colors">{comic.title}</h3>
                </Link>
              </div>
              <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">{comic.subject}</Badge>
                <span className="flex items-center gap-1 text-pink-500">
                  <Heart className="h-4 w-4 fill-current" />
                  {comic.metadata?.likes || 0}
                </span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="text-center mt-8">
        <Button variant="outline" size="lg" asChild>
          <Link href="/gallery">
            View Full Gallery
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
