import type { ReactNode } from "react";

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
}: {
  crumbs: string[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="mb-1.5 text-[11.5px] text-ry-ink-soft">
        {crumbs.slice(0, -1).map((c, i) => (
          <span key={i}>{c} / </span>
        ))}
        <b className="font-medium text-ry-blue-600">{crumbs[crumbs.length - 1]}</b>
      </div>
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-[26px] font-medium uppercase leading-none tracking-wider">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-[12px] text-ry-ink-soft">{subtitle}</p>}
        </div>
        <div className="flex-1" />
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </>
  );
}
