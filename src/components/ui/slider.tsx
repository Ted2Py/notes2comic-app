"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
    value: number[];
    onValueChange: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
  }
>(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={cn(
        "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider-thumb",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
        "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-all",
        "[&::-webkit-slider-thumb]:hover:scale-110",
        "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full",
        "[&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-sm",
        "[&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110",
        className
      )}
      {...props}
    />
  );
});
Slider.displayName = "Slider";

export { Slider };
