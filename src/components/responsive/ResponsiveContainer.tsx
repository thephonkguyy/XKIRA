import React from "react";
import { cn } from "../../lib/utils";

export interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full";
  noPadding?: boolean;
}

const MAX_WIDTHS = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

export default function ResponsiveContainer({
  children,
  className = "",
  maxWidth = "7xl",
  noPadding = false,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto min-w-0 flex flex-col",
        MAX_WIDTHS[maxWidth],
        !noPadding && "px-3 sm:px-5 md:px-6 lg:px-8 py-3 sm:py-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
