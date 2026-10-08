import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Portal from "./Portal";
import { cn } from "../../lib/utils";

export interface ResponsiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  position?: "bottom" | "right";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function ResponsiveSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  position = "bottom",
  children,
  footer,
  className = "",
  bodyClassName = "",
}: ResponsiveSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const isBottom = position === "bottom";

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Sheet Content Container */}
            <div
              className={cn(
                "relative z-10 w-full flex pointer-events-none",
                isBottom
                  ? "items-end justify-center"
                  : "items-stretch justify-end"
              )}
            >
              <motion.div
                initial={isBottom ? { y: "100%" } : { x: "100%" }}
                animate={isBottom ? { y: 0 } : { x: 0 }}
                exit={isBottom ? { y: "100%" } : { x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className={cn(
                  "pointer-events-auto bg-zinc-900 border-zinc-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl",
                  isBottom
                    ? "w-full max-w-2xl max-h-[92dvh] rounded-t-3xl border-t border-x"
                    : "h-full w-full max-w-md border-l",
                  className
                )}
              >
                {/* Pull Handle for mobile bottom sheet */}
                {isBottom && (
                  <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
                )}

                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/40">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {icon && (
                      <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20 flex-shrink-0">
                        {icon}
                      </div>
                    )}
                    <div className="min-w-0">
                      {title && (
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                          {title}
                        </h3>
                      )}
                      {subtitle && (
                        <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 sm:p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                    aria-label="Close sheet"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div
                  className={cn(
                    "flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar min-h-0",
                    isBottom ? "pb-safe" : "",
                    bodyClassName
                  )}
                >
                  {children}
                </div>

                {/* Optional Sticky Footer */}
                {footer && (
                  <div className="flex-shrink-0 p-3.5 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/60 pb-safe">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
