"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ComicCard } from "@/components/comic/comic-card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [comics, setComics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchComics();
    }
  }, [session]);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/register");
    }
  }, [isPending, session, router]);

  const fetchComics = async () => {
    try {
      const response = await fetch("/api/comics");
      if (response.ok) {
        const data = await response.json();
        setComics(data.comics || []);
      }
    } catch (error) {
      console.error("Failed to fetch comics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comic?")) {
      return;
    }

    try {
      const response = await fetch(`/api/comics?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setComics(comics.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete comic:", error);
    }
  };

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Comics</h1>
        <Button asChild>
          <Link href="/create">
            <Plus className="h-4 w-4 mr-2" />
            Create New Comic
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your comics...</p>
        </div>
      ) : comics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comics.map((comic) => (
            <ComicCard
              key={comic.id}
              {...comic}
              thumbnailUrl={comic.panels?.[0]?.imageUrl}
              panelCount={comic.metadata?.panelCount}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t created any comics yet.
          </p>
          <Button asChild>
            <Link href="/create">Create Your First Comic</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
