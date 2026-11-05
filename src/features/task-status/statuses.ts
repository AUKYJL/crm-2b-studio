import type { Enums } from "@/shared/api/database.types";

export const taskStatuses = {
  new: { label: "Новая", className: "bg-status-new-bg text-status-new" },
  in_progress: {
    label: "В работе",
    className: "bg-status-in-progress-bg text-status-in-progress",
  },
  in_review: {
    label: "На проверке",
    className: "bg-status-in-review-bg text-status-in-review",
  },
  rework: {
    label: "На доработке",
    className: "bg-status-rework-bg text-status-rework",
  },
  accepted: {
    label: "Принята",
    className: "bg-status-accepted-bg text-status-accepted",
  },
} satisfies Record<Enums<"task_status">, { label: string; className: string }>;
