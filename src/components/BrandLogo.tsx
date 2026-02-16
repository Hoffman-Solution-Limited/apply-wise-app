import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const SIZE_STYLES = {
  sm: {
    container: "gap-2",
    mark: "h-8 w-8 rounded-xl",
    icon: "h-5 w-5",
    name: "text-sm",
  },
  md: {
    container: "gap-3",
    mark: "h-10 w-10 rounded-xl",
    icon: "h-6 w-6",
    name: "text-lg",
  },
  lg: {
    container: "gap-4",
    mark: "h-14 w-14 rounded-2xl",
    icon: "h-8 w-8",
    name: "text-2xl",
  },
} as const;

export const BrandLogo = ({ size = "md", showTagline = false, className }: BrandLogoProps) => {
  const styles = SIZE_STYLES[size];

  return (
    <div className={cn("flex items-center", styles.container, className)}>
      <div
        className={cn(
          "grid place-items-center bg-gradient-to-br from-primary via-primary to-primary/75 text-primary-foreground shadow-sm ring-1 ring-primary/20",
          styles.mark,
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <circle cx="32" cy="32" r="18" strokeWidth="4" opacity="0.35" />
          <path d="M17 30c1.5-8 8-14 16-14 5 0 9.7 2.1 13 5.7" strokeWidth="4" opacity="0.75" />
          <path d="M23 34l7 7 13-14" strokeWidth="5" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className={cn("font-semibold tracking-tight", styles.name)}>{BRAND.name}</p>
        {showTagline && <p className="text-xs text-muted-foreground">{BRAND.tagline}</p>}
      </div>
    </div>
  );
};
