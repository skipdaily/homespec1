import { Home, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface NavBreadcrumbProps {
  items: {
    label: string;
    href?: string;
  }[];
}

export function NavBreadcrumb({ items }: NavBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 mb-6 text-sm text-muted-foreground pt-8">
      <Link href="/dashboard" className="flex items-center hover:text-primary">
        <Home className="h-4 w-4 mr-1" />
        Dashboard
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link
              href={item.href}
              className={cn("hover:text-primary", {
                "text-foreground font-medium": index === items.length - 1,
              })}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
