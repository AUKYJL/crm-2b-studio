import { Loader2 } from "lucide-react";
import type { HTMLAttributes } from "react";

export const Spinner = ({ className }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mt-10 flex h-24 items-center justify-center ${className}`}>
    <Loader2 className="text-primary h-8 w-8 animate-spin" />
  </div>
);
