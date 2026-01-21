"use client";

import React, { useEffect } from "react";

export default function Modal(props: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { open, title, description, onClose, children } = props;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h3 className="h3">{title}</h3>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <button className="btn btnGhost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}
