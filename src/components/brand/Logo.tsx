import { cn } from "@/lib/utils";

/** ClassPilot mark: a graduation cap resting on an open book, with a small AI "spark" node. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="cp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--electric)" />
          <stop offset="1" stopColor="var(--navy-soft)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="url(#cp-g)" />
      {/* open book */}
      <path
        d="M10 30.5c4.6-1.6 9.3-1.3 14 1.2 4.7-2.5 9.4-2.8 14-1.2v6.3c-4.6-1.5-9.3-1.2-14 1.4-4.7-2.6-9.4-2.9-14-1.4z"
        fill="var(--navy-foreground)"
        opacity="0.95"
      />
      <path
        d="M24 31.7v6.4"
        stroke="var(--navy)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* graduation cap */}
      <path d="M24 10.5 9.5 17.2 24 23.9l14.5-6.7z" fill="var(--navy-foreground)" />
      <path
        d="M15.5 20.4v4.4c0 1.6 3.8 3.3 8.5 3.3s8.5-1.7 8.5-3.3v-4.4L24 24.3z"
        fill="var(--navy-foreground)"
        opacity="0.82"
      />
      <path
        d="M36.6 18.2v6.4"
        stroke="var(--navy-foreground)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* AI spark */}
      <circle cx="36.6" cy="26.2" r="2.3" fill="var(--highlight)" />
    </svg>
  );
}

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span
        className={cn(
          "font-display text-lg font-bold tracking-tight",
          tone === "light" ? "text-navy-foreground" : "text-navy",
        )}
      >
        ClassPilot <span className="text-electric">AI</span>
      </span>
    </span>
  );
}
