"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AddPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (prompt: string) => void;
  currentPanelCount: number;
  maxPanels: number;
  artStyle: string;
  tone: string;
  characterReference?: string;
}

export function AddPanelDialog({
  open,
  onOpenChange,
  onSubmit,
  currentPanelCount,
  maxPanels,
  artStyle,
  tone,
  characterReference,
}: AddPanelDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      onSubmit(prompt.trim());
      setPrompt("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Panel</DialogTitle>
          <DialogDescription>
            Describe what you want in this new panel. The AI will generate it based on your description
            and maintain consistency with the existing comic style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            <p>Panel count: {currentPanelCount} / {maxPanels}</p>
            <p className="text-xs mt-1">
              Style: {artStyle} • Tone: {tone}
              {characterReference && " • Character reference available"}
            </p>
          </div>

          <Textarea
            placeholder="Describe the scene you want to add... e.g., 'The hero discovers a secret door behind the bookshelf, with a mysterious glow emanating from it.'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-none"
            disabled={isGenerating}
            autoFocus
          />

          <p className="text-xs text-muted-foreground">
            Tip: Press Ctrl+Enter (or Cmd+Enter on Mac) to submit
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
