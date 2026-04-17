"use client";
import { useRef, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--spotlight-x", `${x}px`);
    card.style.setProperty("--spotlight-y", `${y}px`);
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (card) {
      card.style.setProperty("--spotlight-x", "-9999px");
      card.style.setProperty("--spotlight-y", "-9999px");
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden", className)}
      style={
        {
          "--spotlight-x": "-9999px",
          "--spotlight-y": "-9999px",
        } as React.CSSProperties
      }
    >
      {/* Spotlight overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(200px circle at var(--spotlight-x) var(--spotlight-y), oklch(0.6 0.22 264 / 0.12), transparent 70%)",
        }}
      />
      {/* Border glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "radial-gradient(200px circle at var(--spotlight-x) var(--spotlight-y), oklch(0.6 0.22 264 / 0.15), transparent 70%)",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />
      {children}
    </div>
  );
}
