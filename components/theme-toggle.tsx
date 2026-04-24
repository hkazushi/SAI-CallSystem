"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  function toggle() {
    setTheme(isDark ? "light" : "dark");
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        aria-label={isDark ? "ライトモードに切替" : "ダークモードに切替"}
        className={cn("text-muted-foreground hover:text-foreground", className)}
      >
        {mounted && (isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />)}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={toggle}
      className={cn("gap-1.5 h-8 text-[11px]", className)}
    >
      {mounted &&
        (isDark ? (
          <>
            <Sun className="w-3.5 h-3.5" /> ライトモード
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5" /> ダークモード
          </>
        ))}
    </Button>
  );
}
