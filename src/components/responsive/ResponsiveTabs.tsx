import React from "react";
import { cn } from "../../lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface ResponsiveTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  variant?: "pill" | "underline" | "cards";
  fullWidth?: boolean;
}

export default function ResponsiveTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = "",
  variant = "pill",
  fullWidth = false,
}: ResponsiveTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full",
        variant === "pill" && "p-1 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl",
        variant === "underline" && "border-b border-zinc-800",
        variant === "cards" && "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2",
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center justify-center gap-2 font-semibold transition-all whitespace-nowrap touch-manipulation min-h-[40px] text-xs sm:text-sm",
              fullWidth && "flex-1",
              variant === "pill" && (
                isActive
                  ? "bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/25 px-3.5 sm:px-4 py-2"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-xl px-3.5 sm:px-4 py-2"
              ),
              variant === "underline" && (
                isActive
                  ? "text-indigo-400 border-b-2 border-indigo-500 pb-2 px-3 sm:px-4 -mb-[1px]"
                  : "text-zinc-400 hover:text-zinc-200 pb-2 px-3 sm:px-4"
              ),
              variant === "cards" && (
                isActive
                  ? "bg-indigo-600/20 border border-indigo-500/50 text-white rounded-2xl p-3 sm:p-4 text-left shadow-lg"
                  : "bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/60 hover:text-white rounded-2xl p-3 sm:p-4 text-left"
              )
            )}
          >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-zinc-800 text-zinc-400"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
