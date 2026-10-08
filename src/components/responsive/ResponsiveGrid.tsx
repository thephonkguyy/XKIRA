import React from "react";
import { cn } from "../../lib/utils";

export interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  minItemWidth?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

const GAP_CLASSES = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4 md:gap-5",
  lg: "gap-4 sm:gap-6 md:gap-8",
};

export default function ResponsiveGrid({
  children,
  className = "",
  minItemWidth,
  cols,
  gap = "md",
  style,
  ...props
}: ResponsiveGridProps) {
  const dynamicStyle = minItemWidth
    ? {
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))`,
        ...style,
      }
    : style;

  return (
    <div
      style={dynamicStyle}
      className={cn(
        "grid w-full min-w-0",
        GAP_CLASSES[gap],
        !minItemWidth && !cols && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        cols?.default && `grid-cols-${cols.default}`,
        cols?.sm && `sm:grid-cols-${cols.sm}`,
        cols?.md && `md:grid-cols-${cols.md}`,
        cols?.lg && `lg:grid-cols-${cols.lg}`,
        cols?.xl && `xl:grid-cols-${cols.xl}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
