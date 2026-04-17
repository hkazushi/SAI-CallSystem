"use client";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  className?: string;
  accentColor?: string; // e.g. "bg-primary" "bg-emerald-400" "bg-violet-400"
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  accentColor = "bg-primary",
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-card/50 border border-white/6 hover:border-white/10 transition-all duration-200 group",
        className
      )}
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

      <div className="relative p-5 pb-7">
        {/* Label */}
        <p className="text-[10px] tracking-[0.13em] uppercase text-muted-foreground/55 font-medium">
          {title}
        </p>

        {/* Big number */}
        <p className="num text-[2.6rem] leading-none font-extrabold mt-2.5 tracking-tight text-foreground group-hover:text-white transition-colors">
          {value}
        </p>

        {/* Change */}
        {change !== undefined && (
          <p
            className={cn(
              "text-[11px] mt-2.5 font-semibold flex items-center gap-1",
              isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-muted-foreground"
            )}
          >
            <span className="text-[13px] leading-none">
              {isPositive ? "↑" : isNegative ? "↓" : "→"}
            </span>
            <span>
              {isPositive ? "+" : ""}
              {change}%
            </span>
            {changeLabel && (
              <span className="text-muted-foreground/50 font-normal">{changeLabel}</span>
            )}
          </p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className={cn("absolute bottom-0 left-0 w-full h-[2px] opacity-60", accentColor)} />
    </div>
  );
}
