import React from "react";
import { cn } from "../../lib/utils";

export interface ResponsivePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "subtle" | "glow" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

const VARIANT_CLASSES = {
  default: "bg-zinc-900/60 border-zinc-800/80 backdrop-blur-xl",
  glass: "bg-white/[0.02] border-white/5 backdrop-blur-2xl hover:bg-white/[0.04]",
  subtle: "bg-zinc-950/80 border-zinc-900 backdrop-blur-lg",
  glow: "bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-900 border-zinc-800/80 shadow-2xl shadow-indigo-600/10",
  elevated: "bg-zinc-900/90 border-zinc-700/60 shadow-2xl backdrop-blur-2xl",
};

const PADDING_CLASSES = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5 md:p-6",
  lg: "p-5 sm:p-7 md:p-8",
};

export default function ResponsivePanel({
  children,
  className = "",
  variant = "default",
  padding = "md",
  ...props
}: ResponsivePanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl sm:rounded-3xl border transition-all min-w-0 relative",
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
