import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

export function AiBusy({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-electric-soft p-4 text-sm text-accent-foreground">
      <LogoMark className="h-8 w-8 animate-pulse" />
      <div className="flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-xs opacity-80">
          This can take up to a minute. You can keep this page open.
        </div>
      </div>
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
