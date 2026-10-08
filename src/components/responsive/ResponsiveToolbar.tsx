import React from "react";
import { cn } from "../../lib/utils";

export interface ResponsiveToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  justify?: "start" | "between" | "end" | "center";
}

export default function ResponsiveToolbar({
  children,
  className = "",
  justify = "between",
  ...props
}: ResponsiveToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 sm:gap-3 w-full min-w-0",
        justify === "between" && "justify-between",
        justify === "start" && "justify-start",
        justify === "end" && "justify-end",
        justify === "center" && "justify-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
