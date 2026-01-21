"use client";

import { useRef, useState, useEffect } from "react";
import type { EnhancedSpeechBubble, EnhancedBubblePosition } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface DraggableBubbleProps {
  bubble: EnhancedSpeechBubble;
  position: EnhancedBubblePosition;
  imageUrl: string;
  onUpdate: (bubble: EnhancedSpeechBubble, position: EnhancedBubblePosition) => void;
  onSelect: () => void;
  isSelected: boolean;
  onTextChange?: (text: string) => void;
}

// Get tail CSS based on position
function getTailStyle(pos: EnhancedBubblePosition, bubble: EnhancedSpeechBubble) {
  if (!pos.tailPosition || pos.tailPosition === "none") {
    return null;
  }

  const tailLength = pos.tailLength || 10;

  // Tail positioning styles
  const tailStyles: Record<string, React.CSSProperties> = {
    "top-left": {
      position: "absolute",
      top: `-${tailLength}%`,
      left: "25%",
      width: "0",
      height: "0",
      borderLeft: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength / 2}% solid transparent`,
      borderBottom: `${tailLength}% solid`,
    },
    "top-center": {
      position: "absolute",
      top: `-${tailLength}%`,
      left: `calc(50% - ${tailLength / 2}%)`,
      width: "0",
      height: "0",
      borderLeft: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength / 2}% solid transparent`,
      borderBottom: `${tailLength}% solid`,
    },
    "top-right": {
      position: "absolute",
      top: `-${tailLength}%`,
      right: "25%",
      width: "0",
      height: "0",
      borderLeft: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength / 2}% solid transparent`,
      borderBottom: `${tailLength}% solid`,
    },
    "bottom-left": {
      position: "absolute",
      bottom: `-${tailLength}%`,
      left: "25%",
      width: "0",
      height: "0",
      borderLeft: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength / 2}% solid transparent`,
      borderTop: `${tailLength}% solid`,
    },
    "bottom-center": {
      position: "absolute",
      bottom: `-${tailLength}%`,
      left: `calc(50% - ${tailLength / 2}%)`,
      width: "0",
      height: "0",
      borderLeft: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength / 2}% solid transparent`,
      borderTop: `${tailLength}% solid`,
    },
    "bottom-right": {
      position: "absolute",
      bottom: `-${tailLength}%`,
      right: "25%",
      width: "0",
      height: "0",
      borderLeft: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength / 2}% solid transparent`,
      borderTop: `${tailLength}% solid`,
    },
    "left": {
      position: "absolute",
      left: `-${tailLength}%`,
      top: "50%",
      width: "0",
      height: "0",
      borderTop: `${tailLength / 2}% solid transparent`,
      borderBottom: `${tailLength / 2}% solid transparent`,
      borderRight: `${tailLength}% solid`,
    },
    "right": {
      position: "absolute",
      right: `-${tailLength}%`,
      top: "50%",
      width: "0",
      height: "0",
      borderTop: `${tailLength / 2}% solid transparent`,
      borderBottom: `${tailLength / 2}% solid transparent`,
      borderLeft: `${tailLength}% solid`,
    },
  };

  const baseStyle = tailStyles[pos.tailPosition];
  if (!baseStyle) return null;

  const backgroundColor = bubble.backgroundColor || "#ffffff";

  // For top/bottom tails, use border-top/border-bottom color
  if (pos.tailPosition?.startsWith("top")) {
    return { ...baseStyle, borderBottomColor: backgroundColor };
  } else if (pos.tailPosition?.startsWith("bottom")) {
    return { ...baseStyle, borderTopColor: backgroundColor };
  } else if (pos.tailPosition === "left") {
    return { ...baseStyle, borderRightColor: backgroundColor };
  } else if (pos.tailPosition === "right") {
    return { ...baseStyle, borderLeftColor: backgroundColor };
  }

  return baseStyle;
}

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function DraggableBubble({
  bubble,
  position,
  onUpdate,
  onSelect,
  isSelected,
  onTextChange,
}: DraggableBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: position.x, y: position.y });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Text editing state
  const [isEditing, setIsEditing] = useState(false);

  // Use key pattern: reset edited text when bubble.id or bubble.text changes
  // The component will re-render with new props, and editedText resets on blur
  const [editedText, setEditedText] = useState(bubble.text);

  // Auto-focus and select text when editing starts
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const handleTextClick = (e: React.MouseEvent) => {
    // Only handle click if not editing - when editing, let the text handle cursor positioning
    if (!isEditing) {
      e.stopPropagation();
      onSelect();
    }
  };

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    // Double click enables editing
    e.stopPropagation();
    if (isSelected && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (editedText !== bubble.text) {
      onTextChange?.(editedText);
      onUpdate({ ...bubble, text: editedText }, position);
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditedText(bubble.text);
      textRef.current?.blur();
    }
  };

  const getResizeCursor = (direction: ResizeDirection): string => {
    const cursors: Record<ResizeDirection, string> = {
      'nw': 'nwse-resize',
      'n': 'ns-resize',
      'ne': 'nesw-resize',
      'e': 'ew-resize',
      'se': 'nwse-resize',
      's': 'ns-resize',
      'sw': 'nesw-resize',
      'w': 'ew-resize',
    };
    return cursors[direction] ?? 'move';
  };

  const handleResizeStart = (direction: ResizeDirection, e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height || 20,
      posX: position.x,
      posY: position.y,
    });
    onSelect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing || !resizeDirection || !bubbleRef.current?.parentElement) return;

    const container = bubbleRef.current.parentElement;
    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;

    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newX = resizeStart.posX;
    let newY = resizeStart.posY;
    const minSize = 5; // Minimum 5% width/height
    const maxSize = 90; // Maximum 90% to keep in bounds

    // Handle each direction
    if (resizeDirection.includes('e')) {
      newWidth = Math.min(maxSize, Math.max(minSize, resizeStart.width + deltaX));
    }
    if (resizeDirection.includes('w')) {
      newWidth = Math.min(maxSize, Math.max(minSize, resizeStart.width - deltaX));
      newX = resizeStart.posX + (resizeStart.width - newWidth);
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.min(maxSize, Math.max(minSize, (resizeStart.height || 20) + deltaY));
    }
    if (resizeDirection.includes('n')) {
      newHeight = Math.min(maxSize, Math.max(minSize, (resizeStart.height || 20) - deltaY));
      newY = resizeStart.posY + ((resizeStart.height || 20) - newHeight);
    }

    // Clamp position to keep bubble within container
    newX = Math.max(0, Math.min(100 - newWidth, newX));
    newY = Math.max(0, Math.min(100 - newHeight, newY));

    onUpdate(bubble, {
      ...position,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeDirection(null);
  };

  const getBubbleStyle = () => {
    const base: React.CSSProperties = {
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: `${position.width}%`,
      // When height is set, use it as a fixed height. Otherwise let it auto-size.
      minHeight: '3em', // Minimum height to prevent collapse
      height: position.height ? `${position.height}%` : 'auto',
      maxHeight: position.height ? undefined : '50%', // Only limit max when auto-sizing
      maxWidth: "100%",
      transform: `rotate(${position.rotation || 0}deg)`,
      wordWrap: "break-word",
      overflowWrap: "break-word",
      hyphens: "auto",
    };

    if (bubble.shadow?.enabled) {
      base.boxShadow = `${bubble.shadow.offsetX || 0}px ${bubble.shadow.offsetY || 0}px ${bubble.shadow.blur || 4}px ${bubble.shadow.color || "rgba(0,0,0,0.3)"}`;
    }

    return base;
  };

  const getBubbleClass = () => {
    const classes = [
      "absolute border-2 p-3 font-comic text-sm leading-tight shadow-md cursor-move",
      "overflow-hidden", // Prevent content overflow
      isSelected && "ring-2 ring-primary",
    ];

    // Add shape-specific classes
    switch (bubble.type) {
      case "thought":
        classes.push("rounded-full border-dashed");
        break;
      case "shout":
        classes.push("clip-polygon");
        break;
      case "whisper":
        classes.push("rounded-lg border-dashed");
        break;
      case "box":
        classes.push("rounded-none");
        break;
      case "rounded-box":
        classes.push("rounded-2xl");
        break;
      default:
        classes.push("rounded-lg");
    }

    return cn(classes);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Skip drag if clicking on resize handles or editing text
    if ((e.target as HTMLElement).classList.contains("resize-handle")) return;
    if (isEditing) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: position.x, y: position.y });
    onSelect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Handle resize
    if (isResizing) {
      handleResizeMove(e);
      return;
    }

    // Handle drag
    if (!isDragging || isEditing) return;

    const container = bubbleRef.current?.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    // Clamp position to keep bubble fully within container
    const maxX = 100 - position.width;
    const maxY = 100 - (position.height || 20);
    const newX = Math.max(0, Math.min(maxX, initialPos.x + deltaX));
    const newY = Math.max(0, Math.min(maxY, initialPos.y + deltaY));

    onUpdate(bubble, { ...position, x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    handleResizeEnd();
  };

  const handlePointerLeave = () => {
    setIsDragging(false);
    handleResizeEnd();
  };

  const tailStyle = getTailStyle(position, bubble);

  return (
    <div
      ref={bubbleRef}
      className={getBubbleClass()}
      style={{
        ...getBubbleStyle(),
        backgroundColor: bubble.backgroundColor || "#ffffff",
        borderColor: bubble.borderColor || "#000000",
        borderWidth: `${bubble.borderWidth || 2}px`,
        color: bubble.textColor || "#000000",
        fontFamily: bubble.fontFamily || "Comic Sans MS",
        fontSize: `${Math.min(bubble.fontSize || 16, 24)}px`,
        fontWeight: bubble.fontWeight || "normal",
        textShadow: !bubble.shadow?.enabled
          ? "1px 1px 0 rgba(255,255,255,0.5), -1px -1px 0 rgba(255,255,255,0.5)"
          : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* ContentEditable text */}
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          "block outline-none min-h-[1em]",
          isEditing && "cursor-text select-text",
          !isEditing && "pointer-events-auto select-none"
        )}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
        onClick={handleTextClick}
        onDoubleClick={handleTextDoubleClick}
        onBlur={handleTextBlur}
        onKeyDown={handleTextKeyDown}
        onInput={(e) => setEditedText(e.currentTarget.textContent || "")}
      >
        {bubble.text}
      </div>

      {tailStyle && <div style={tailStyle} className="pointer-events-none" />}

      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 8 Resize Handles - corners */}
          <div
            className="resize-handle absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('nw') }}
            onPointerDown={(e) => handleResizeStart('nw', e)}
          />
          <div
            className="resize-handle absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('ne') }}
            onPointerDown={(e) => handleResizeStart('ne', e)}
          />
          <div
            className="resize-handle absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('sw') }}
            onPointerDown={(e) => handleResizeStart('sw', e)}
          />
          <div
            className="resize-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('se') }}
            onPointerDown={(e) => handleResizeStart('se', e)}
          />
          {/* Edge handles */}
          <div
            className="resize-handle absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('n') }}
            onPointerDown={(e) => handleResizeStart('n', e)}
          />
          <div
            className="resize-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('s') }}
            onPointerDown={(e) => handleResizeStart('s', e)}
          />
          <div
            className="resize-handle absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('w') }}
            onPointerDown={(e) => handleResizeStart('w', e)}
          />
          <div
            className="resize-handle absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
            style={{ cursor: getResizeCursor('e') }}
            onPointerDown={(e) => handleResizeStart('e', e)}
          />
        </div>
      )}
    </div>
  );
}
