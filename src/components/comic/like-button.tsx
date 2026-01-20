"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";

export function LikeButton({
  comicId,
  comicUserId,
  initialLiked,
  initialLikes,
}: {
  comicId: string;
  comicUserId: string;
  initialLiked: boolean;
  initialLikes: number;
}) {
  const session = useSession();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = async () => {
    if (!session.data) {
      toast.error("Please log in to like comics", {
        duration: 2000,
      });
      return;
    }

    // Check if user is trying to like their own comic
    if (session.data.user.id === comicUserId) {
      toast("Can't like your own comic", {
        duration: 1500,
      });
      return;
    }

    try {
      const response = await fetch(`/api/comics/${comicId}/like`, {
        method: isLiked ? "DELETE" : "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(!isLiked);
        setLikes(typeof data.likes === "number" ? data.likes : Number(data.likes));
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

  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size="lg"
      className={`gap-2 ${isLiked ? "bg-red-500 hover:bg-red-600" : ""}`}
      onClick={handleLike}
    >
      <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
      {isLiked ? "Liked" : "Like"} ({likes})
    </Button>
  );
}
