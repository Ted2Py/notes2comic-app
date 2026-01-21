"use client";

import { useState } from "react";
import { Scan, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DetectedTextBox } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface TextBoxDetectorProps {
  panelId: string;
  comicId: string;
  imageUrl: string;
  detectedBoxes: DetectedTextBox[];
  onBoxesUpdate: (boxes: DetectedTextBox[]) => void;
  onTextEdit: (boxId: string, text: string) => void;
}

export function TextBoxDetector({
  panelId,
  comicId,
  imageUrl,
  detectedBoxes,
  onBoxesUpdate,
  onTextEdit,
}: TextBoxDetectorProps) {
  const [detecting, setDetecting] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const response = await fetch(
        `/api/comics/${comicId}/panels/${panelId}/detect-text`,
        { method: "POST" }
      );
      const data = await response.json();
      if (data.success) {
        onBoxesUpdate(data.textBoxes);
      }
    } catch (error) {
      console.error("Detection failed:", error);
    } finally {
      setDetecting(false);
    }
  };

  const handleBoxClick = (box: DetectedTextBox) => {
    setSelectedBoxId(box.id);
    const newText = prompt("Edit text:", box.text);
    if (newText !== null) {
      onTextEdit(box.id, newText);
    }
    setSelectedBoxId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">AI Text Detection</h3>
        <Button
          size="sm"
          onClick={handleDetect}
          disabled={detecting}
        >
          {detecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Scan className="h-4 w-4 mr-2" />
              Detect Text
            </>
          )}
        </Button>
      </div>

      {detectedBoxes.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Found {detectedBoxes.length} text region{detectedBoxes.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Overlay of detected boxes on image */}
      {detectedBoxes.length > 0 && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Comic panel" className="w-full" />
          {detectedBoxes.map((box) => (
            <div
              key={box.id}
              className={cn(
                "absolute border-2 border-yellow-400 bg-yellow-400/20 cursor-pointer",
                "hover:bg-yellow-400/40 transition-colors",
                selectedBoxId === box.id && "ring-2 ring-primary"
              )}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
              onClick={() => handleBoxClick(box)}
              title={`${box.text} (confidence: ${(box.confidence * 100).toFixed(0)}%)`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
