"use client";
import { useEffect, useRef } from "react";

export function CursorSpotlight() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
    };

    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={spotRef}
      className="pointer-events-none fixed z-0 w-[600px] h-[600px] rounded-full"
      style={{
        background: "radial-gradient(circle, oklch(0.6 0.22 264 / 0.07) 0%, transparent 70%)",
        willChange: "transform",
        transition: "transform 0.15s ease-out",
      }}
    />
  );
}
