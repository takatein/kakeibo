interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
}

export function PageHeader({ title, subtitle, rightAction, leftAction }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(245, 245, 245, 0.95)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {leftAction && <div>{leftAction}</div>}
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1E3A5F' }}>{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
