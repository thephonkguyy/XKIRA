import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "./Portal";
import { cn } from "../../lib/utils";

export interface ResponsivePopoverProps {
  trigger: (props: { isOpen: boolean; toggle: () => void; ref: React.RefObject<HTMLButtonElement | HTMLDivElement> }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
}

export default function ResponsivePopover({
  trigger,
  children,
  align = "left",
  className = "",
  width = "w-64 sm:w-72",
}: ResponsivePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<any>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverEstimatedHeight = 280;

    const openUp = spaceBelow < popoverEstimatedHeight && spaceAbove > spaceBelow;

    let targetLeft = rect.left;
    if (align === "right") {
      targetLeft = rect.right - 280;
    } else if (align === "center") {
      targetLeft = rect.left + rect.width / 2 - 140;
    }

    // Clamp horizontal position so it never extends beyond viewport
    const clampedLeft = Math.max(12, Math.min(targetLeft, viewportWidth - 292));
    const targetTop = openUp ? rect.top - 8 : rect.bottom + 8;

    setCoords({
      top: targetTop,
      left: clampedLeft,
      openUp,
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      const handleClickOutside = (e: MouseEvent) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, align]);

  return (
    <>
      {trigger({
        isOpen,
        toggle: () => {
          setIsOpen(!isOpen);
          updatePosition();
        },
        ref: triggerRef,
      })}

      <Portal>
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 pointer-events-none">
              <div
                className="fixed inset-0 bg-black/20 md:bg-transparent pointer-events-auto"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.95, y: coords.openUp ? 8 : -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: coords.openUp ? 8 : -8 }}
                transition={{ duration: 0.15 }}
                style={{
                  top: coords.openUp ? undefined : `${coords.top}px`,
                  bottom: coords.openUp ? `${window.innerHeight - coords.top}px` : undefined,
                  left: `${coords.left}px`,
                }}
                className={cn(
                  "pointer-events-auto fixed bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 max-h-[min(340px,calc(100dvh-32px))] overflow-y-auto no-scrollbar max-w-[calc(100vw-24px)]",
                  width,
                  className
                )}
              >
                {children({ close: () => setIsOpen(false) })}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
