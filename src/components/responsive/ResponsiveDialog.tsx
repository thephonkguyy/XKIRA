import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Portal from "./Portal";
import { cn } from "../../lib/utils";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export interface ResponsiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: DialogSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  className?: string;
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl sm:max-w-2xl",
  "2xl": "max-w-2xl sm:max-w-4xl",
  full: "max-w-full sm:max-w-6xl",
};

export default function ResponsiveDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = "lg",
  children,
  footer,
  hideCloseButton = false,
  className = "",
  bodyClassName = "",
  closeOnBackdrop = true,
  ariaLabel,
}: ResponsiveDialogProps) {
  // Handle escape key
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

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : ariaLabel || "Dialog"}
            className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeOnBackdrop ? onClose : undefined}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className={cn(
                "relative z-10 w-full bg-zinc-900/95 border border-zinc-800/90 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden backdrop-blur-2xl",
                SIZE_CLASSES[size],
                className
              )}
            >
              {/* Header */}
              {(title || !hideCloseButton) && (
                <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/40">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {icon && (
                      <div className="flex-shrink-0 p-2 sm:p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20">
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

                  {!hideCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 sm:p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1 flex-shrink-0"
                      aria-label="Close dialog"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Scrollable Body */}
              <div
                className={cn(
                  "flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar min-h-0",
                  bodyClassName
                )}
              >
                {children}
              </div>

              {/* Sticky Footer */}
              {footer && (
                <div className="flex-shrink-0 p-3.5 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/60 pb-safe">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
