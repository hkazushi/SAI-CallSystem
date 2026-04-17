interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-1">
      <div className="flex items-start gap-3">
        {/* Accent mark */}
        <div className="mt-1.5 w-[3px] h-5 rounded-full bg-gradient-to-b from-primary to-primary/20 shrink-0" />
        <div>
          <h1 className="text-[1.35rem] font-extrabold tracking-tight leading-none text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-[13px] text-muted-foreground/65 mt-1.5 leading-snug">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
}
