import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

export default function Portal({ children, containerId = "portal-root" }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let elem = document.getElementById(containerId);
    let created = false;
    if (!elem) {
      elem = document.createElement("div");
      elem.id = containerId;
      elem.className = "relative z-50";
      document.body.appendChild(elem);
      created = true;
    }
    setContainer(elem);
    setMounted(true);

    return () => {
      if (created && elem?.parentNode) {
        elem.parentNode.removeChild(elem);
      }
    };
  }, [containerId]);

  if (!mounted || !container) return null;

  return createPortal(children, container);
}
