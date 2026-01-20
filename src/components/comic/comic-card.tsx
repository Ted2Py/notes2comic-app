"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/date";

interface ComicCardProps {
  id: string;
  title: string;
  status: "draft" | "generating" | "completed" | "failed";
  thumbnailUrl?: string;
  panelCount?: number;
  isPublic?: boolean;
  createdAt?: Date | string;
  onDelete: (id: string) => void;
  onVisibilityToggle?: (id: string, isPublic: boolean) => void;
}

export function ComicCard({
  id,
  title,
  status,
  thumbnailUrl,
  panelCount,
  isPublic,
  createdAt,
  onDelete,
  onVisibilityToggle,
}: ComicCardProps) {
  const statusColors = {
    draft: "bg-gray-500",
    generating: "bg-blue-500 animate-pulse",
    completed: "bg-green-500",
    failed: "bg-red-500",
  };

  const statusLabels = {
    draft: "Draft",
    generating: "Generating...",
    completed: "Completed",
    failed: "Failed",
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="overflow-hidden h-full">
        <Link href={`/comics/${id}`}>
          <CardContent className="p-0">
            {thumbnailUrl ? (
              <motion.img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-48 object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
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
            <Link href={`/comics/${id}`} className="flex-1">
              <h3 className="font-semibold truncate">{title}</h3>
            </Link>
            <div className="flex gap-1">
              {isPublic !== undefined && (
                <Badge variant={isPublic ? "default" : "secondary"}>
                  {isPublic ? "Public" : "Private"}
                </Badge>
              )}
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
            </div>
          </div>
          {panelCount && (
            <p className="text-sm text-muted-foreground">
              {panelCount} panels
            </p>
          )}
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {onVisibilityToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVisibilityToggle(id, !isPublic)}
                  title={isPublic ? "Make private" : "Make public"}
                >
                  {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/comics/${id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
            {createdAt && (
              <span className="text-xs text-foreground/60 font-medium">
                {formatRelativeTime(createdAt)}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
