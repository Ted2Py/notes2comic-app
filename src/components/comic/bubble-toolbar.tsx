"use client";

import { Palette, Type, Glasses } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EnhancedSpeechBubble, EnhancedBubblePosition } from "@/lib/schema";

interface BubbleToolbarProps {
  bubble: EnhancedSpeechBubble;
  position: EnhancedBubblePosition;
  onBubbleChange: (bubble: EnhancedSpeechBubble) => void;
  onPositionChange: (position: EnhancedBubblePosition) => void;
}

const BUBBLE_TYPES = [
  { value: "dialogue", label: "Dialogue" },
  { value: "thought", label: "Thought" },
  { value: "narration", label: "Narration" },
  { value: "shout", label: "Shout" },
  { value: "whisper", label: "Whisper" },
  { value: "whisper-thought", label: "Whisper Thought" },
  { value: "box", label: "Box" },
  { value: "rounded-box", label: "Rounded Box" },
] as const;

const FONT_FAMILIES = [
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Courier" },
  { value: "Impact", label: "Impact" },
];

const COLOR_PRESETS = [
  "#ffffff", "#f87171", "#fbbf24", "#34d399", "#60a5fa",
  "#818cf8", "#a78bfa", "#f472b6", "#000000", "#6b7280"
];

export function BubbleToolbar({
  bubble,
  position,
  onBubbleChange,
  onPositionChange,
}: BubbleToolbarProps) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2 p-2.5 border rounded-lg bg-muted/50">
      {/* Style Section - Top Left */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
          <Palette className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Style</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div>
            <Label className="text-[11px]">Type</Label>
            <select
              value={bubble.type}
              onChange={(e) => onBubbleChange({ ...bubble, type: e.target.value as any })}
              className="w-full h-8 px-2 border rounded text-xs"
            >
              {BUBBLE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[11px]">Bg Color</Label>
            <div className="flex gap-1 flex-wrap">
              {COLOR_PRESETS.slice(0, 6).map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded border"
                  style={{ backgroundColor: color, borderColor: bubble.backgroundColor === color ? "var(--primary)" : "#ccc" }}
                  onClick={() => onBubbleChange({ ...bubble, backgroundColor: color })}
                />
              ))}
              <Input
                type="color"
                value={bubble.backgroundColor || "#ffffff"}
                onChange={(e) => onBubbleChange({ ...bubble, backgroundColor: e.target.value })}
                className="w-6 h-5 p-0"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Border Color</Label>
            <div className="flex gap-1 flex-wrap">
              {COLOR_PRESETS.slice(0, 5).map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded border"
                  style={{ backgroundColor: color, borderColor: bubble.borderColor === color ? "var(--primary)" : "#ccc" }}
                  onClick={() => onBubbleChange({ ...bubble, borderColor: color })}
                />
              ))}
              <Input
                type="color"
                value={bubble.borderColor || "#000000"}
                onChange={(e) => onBubbleChange({ ...bubble, borderColor: e.target.value })}
                className="w-6 h-5 p-0"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Border: {bubble.borderWidth || 2}px</Label>
            <input
              type="range"
              min="0"
              max="10"
              value={bubble.borderWidth || 2}
              onChange={(e) => onBubbleChange({ ...bubble, borderWidth: Number(e.target.value) })}
              className="w-full h-1.5"
            />
          </div>

          <div>
            <Label className="text-[11px]">Rotate</Label>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="-180"
                max="180"
                value={position.rotation || 0}
                onChange={(e) => onPositionChange({ ...position, rotation: Number(e.target.value) })}
                className="flex-1 h-1.5 min-w-0"
              />
              <Input
                type="number"
                min="-180"
                max="180"
                value={position.rotation || 0}
                onChange={(e) => onPositionChange({ ...position, rotation: Number(e.target.value) })}
                className="w-12 h-6 px-1 text-[10px] leading-none appearance-none rotate-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Text Section - Top Right */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
          <Type className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Text</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div>
            <Label className="text-[11px]">Font</Label>
            <select
              value={bubble.fontFamily || "Comic Sans MS"}
              onChange={(e) => onBubbleChange({ ...bubble, fontFamily: e.target.value })}
              className="w-full h-8 px-2 border rounded text-xs"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[11px]">Size: {bubble.fontSize || 16}px</Label>
            <input
              type="range"
              min="12"
              max="48"
              value={bubble.fontSize || 16}
              onChange={(e) => onBubbleChange({ ...bubble, fontSize: Number(e.target.value) })}
              className="w-full h-1.5"
            />
          </div>

          <div>
            <Label className="text-[11px]">Weight</Label>
            <select
              value={bubble.fontWeight || "normal"}
              onChange={(e) => onBubbleChange({ ...bubble, fontWeight: e.target.value as any })}
              className="w-full h-8 px-2 border rounded text-xs"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="300">Light</option>
              <option value="500">Medium</option>
              <option value="700">Bold</option>
              <option value="900">Black</option>
            </select>
          </div>

          <div>
            <Label className="text-[11px]">Text Color</Label>
            <div className="flex gap-1 flex-wrap">
              {COLOR_PRESETS.slice(0, 6).map((color) => (
                <button
                  key={color}
                  className="w-5 h-5 rounded border"
                  style={{ backgroundColor: color, borderColor: bubble.textColor === color ? "var(--primary)" : "#ccc" }}
                  onClick={() => onBubbleChange({ ...bubble, textColor: color })}
                />
              ))}
              <Input
                type="color"
                value={bubble.textColor || "#000000"}
                onChange={(e) => onBubbleChange({ ...bubble, textColor: e.target.value })}
                className="w-6 h-5 p-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shadow Section - Bottom Right */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
          <Glasses className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Shadow</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shadow-enabled"
              checked={bubble.shadow?.enabled === true}
              onChange={(e) => {
                if (e.target.checked) {
                  onBubbleChange({
                    ...bubble,
                    shadow: { ...(bubble.shadow || {}), enabled: true }
                  });
                } else {
                  onBubbleChange({
                    ...bubble,
                    shadow: { ...(bubble.shadow || {}), enabled: false }
                  });
                }
              }}
              className="h-3 w-3"
            />
            <Label htmlFor="shadow-enabled" className="text-[11px]">Enable</Label>
          </div>

          {bubble.shadow?.enabled && (
            <>
              <div>
                <Label className="text-[11px]">Blur: {bubble.shadow.blur ?? 4}px</Label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={bubble.shadow.blur ?? 4}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...(bubble.shadow || {}), enabled: true, blur: Number(e.target.value) }
                  })}
                  className="w-full h-1.5"
                />
              </div>

              <div>
                <Label className="text-[11px]">X: {bubble.shadow.offsetX ?? 2}</Label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  value={bubble.shadow.offsetX ?? 2}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...(bubble.shadow || {}), enabled: true, offsetX: Number(e.target.value) }
                  })}
                  className="w-full h-1.5"
                />
              </div>

              <div>
                <Label className="text-[11px]">Y: {bubble.shadow.offsetY ?? 2}</Label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  value={bubble.shadow.offsetY ?? 2}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...(bubble.shadow || {}), enabled: true, offsetY: Number(e.target.value) }
                  })}
                  className="w-full h-1.5"
                />
              </div>

              <div>
                <Label className="text-[11px]">Color</Label>
                <Input
                  type="color"
                  value={bubble.shadow.color || "#000000"}
                  onChange={(e) => onBubbleChange({
                    ...bubble,
                    shadow: { ...(bubble.shadow || {}), enabled: true, color: e.target.value }
                  })}
                  className="w-6 h-5 p-0"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
