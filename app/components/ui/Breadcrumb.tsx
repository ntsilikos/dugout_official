import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mb-1 min-w-0 max-w-full">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span
            key={i}
            className={`flex items-center gap-1.5 ${isLast ? "min-w-0" : "shrink-0"}`}
          >
            {i > 0 && <span className="text-[var(--text-muted)] shrink-0">/</span>}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-[var(--text-secondary)] transition-colors shrink-0"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`text-[var(--text-secondary)] font-medium ${
                  isLast ? "truncate" : ""
                }`}
                title={isLast ? item.label : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
