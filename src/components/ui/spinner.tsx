import { Loader2 } from "lucide-react";

export default function Spinner({ title = "Loading...", subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-dvh">
      <Loader2 className="animate-spin text-primary w-10 h-10 mb-2" />
      <div className="text-xl font-semibold">{title}</div>
      {subtitle && <div className="text-muted-foreground text-sm text-center max-w-xs">{subtitle}</div>}
    </div>
  );
}
