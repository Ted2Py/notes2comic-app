"use client";

import { FileText, Image, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {file.type.startsWith("image/") && (
            <Image className="h-10 w-10 text-muted-foreground" aria-label="Image file" />
          )}
          {file.type.startsWith("video/") && (
            <Film className="h-10 w-10 text-muted-foreground" aria-label="Video file" />
          )}
          {!file.type.startsWith("image/") && !file.type.startsWith("video/") && (
            <FileText className="h-10 w-10 text-muted-foreground" aria-label="Document file" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
