interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, subtitle, rightAction }: PageHeaderProps) {
  return (
    <header className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-40 px-4 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
