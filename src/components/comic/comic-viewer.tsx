"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExportButton } from "./export-button";

interface Panel {
  id: string;
  panelNumber: number;
  imageUrl: string;
  caption: string;
}

interface Comic {
  id: string;
  title: string;
  description?: string | null;
  panels: Panel[];
}

interface ComicViewerProps {
  comic: Comic;
  comicId: string;
  comicTitle: string;
  isOwner?: boolean;
}

export function ComicViewer({ comic, comicId, comicTitle, isOwner: _isOwner }: ComicViewerProps) {
  const [currentPanel, setCurrentPanel] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextPanel = () => {
    if (currentPanel < comic.panels.length - 1) {
      setDirection(1);
      setCurrentPanel(currentPanel + 1);
    }
  };

  const prevPanel = () => {
    if (currentPanel > 0) {
      setDirection(-1);
      setCurrentPanel(currentPanel - 1);
    }
  };

  const panel = comic.panels[currentPanel];

  if (!panel) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No panels available</p>
      </div>
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={currentPanel}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
        >
          <Card className="overflow-hidden">
            <motion.img
              src={panel.imageUrl}
              alt={`Panel ${panel.panelNumber}`}
              className="w-full"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            />
            {panel.caption && (
              <motion.div
                className="p-4 bg-muted/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <p className="text-center">{panel.caption}</p>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            onClick={prevPanel}
            disabled={currentPanel === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        </motion.div>

        <motion.span
          className="text-muted-foreground"
          key={currentPanel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Panel {currentPanel + 1} of {comic.panels.length}
        </motion.span>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            onClick={nextPanel}
            disabled={currentPanel === comic.panels.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      </div>

      <motion.div
        className="flex justify-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <ExportButton comicId={comicId} comicTitle={comicTitle} />
      </motion.div>
    </div>
  );
}
