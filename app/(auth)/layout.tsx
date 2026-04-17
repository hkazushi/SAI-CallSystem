export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,oklch(0.55_0.22_264/0.12)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_100%,oklch(0.55_0.20_290/0.08)_0%,transparent_70%)]" />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
