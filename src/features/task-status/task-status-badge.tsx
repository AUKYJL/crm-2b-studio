import type { Enums } from "@/shared/api/database.types";
import { cn } from "@/shared/lib/cn";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { taskStatuses } from "./statuses";

export function TaskStatusBadge({ status }: { status: Enums<"task_status"> }) {
  const { label, className } = taskStatuses[status];

  return (
    <Typography
      as={TYPOGRAPHY_AS.SPAN}
      variant={TYPOGRAPHY_VARIANT.CAPTION}
      color={TYPOGRAPHY_COLOR.INHERIT}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-0.5 font-medium",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {label}
    </Typography>
  );
}
