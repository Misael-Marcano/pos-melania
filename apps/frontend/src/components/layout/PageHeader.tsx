'use client';

interface PageHeaderProps {
  title:      string;
  breadcrumb: string[];
  actions?:   React.ReactNode;
}

export function PageHeader({ title, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-navy-400 mb-1">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-navy-300">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-navy-500 font-medium' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <h2 className="text-xl font-bold text-navy-800 font-display">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
