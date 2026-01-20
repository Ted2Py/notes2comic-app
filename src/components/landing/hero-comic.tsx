"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";

export function HeroComic() {
  const [currentPanel, setCurrentPanel] = useState(0);

  const panels = [
    {
      id: 1,
      text: "Upload your notes...",
      subtext: "PDFs, images, or videos",
      icon: Upload,
      bgColor: "from-blue-500/20 to-blue-600/10 dark:from-blue-500/30 dark:to-blue-600/20",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      id: 2,
      text: "AI analyzes content...",
      subtext: "Extracts key concepts",
      icon: Sparkles,
      bgColor: "from-purple-500/20 to-purple-600/10 dark:from-purple-500/30 dark:to-purple-600/20",
      borderColor: "border-purple-200 dark:border-purple-800",
    },
    {
      id: 3,
      text: "Comic generated!",
      subtext: "Visual learning made fun",
      icon: Zap,
      bgColor: "from-green-500/20 to-green-600/10 dark:from-green-500/30 dark:to-green-600/20",
      borderColor: "border-green-200 dark:border-green-800",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPanel((prev) => (prev + 1) % panels.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [panels.length]);

  const current = panels[currentPanel];
  const Icon = current!.icon;

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPanel}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`aspect-video rounded-xl border-2 ${current!.borderColor} bg-gradient-to-br ${current!.bgColor} flex flex-col items-center justify-center p-8 shadow-lg`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-4"
          >
            <Icon className="h-16 w-16 text-primary" strokeWidth={2} />
          </motion.div>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl md:text-3xl font-bold text-foreground"
          >
            {current!.text}
          </motion.p>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mt-2"
          >
            {current!.subtext}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* Panel indicators */}
      <div className="flex gap-2 justify-center mt-6">
        {panels.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => setCurrentPanel(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentPanel
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    </div>
  );
}

// Import icons
function Upload({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth || 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
