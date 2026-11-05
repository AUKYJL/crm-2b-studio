import { Link } from "react-router-dom";

import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { TaskStatusBadge } from "@/features/task-status/task-status-badge";
import type { TaskDetail } from "@/features/tasks/task-detail-api";

export function TaskProperties({
  task,
  objectPath,
}: {
  task: TaskDetail;
  objectPath: string;
}) {
  const rows = [
    { label: "Статус", value: <TaskStatusBadge status={task.status} /> },
    {
      label: "Объект",
      value: (
        <Link to={objectPath} className="hover:underline">
          {task.object.name}
        </Link>
      ),
    },
    { label: "Исполнитель", value: task.assigneeName ?? "—" },
    { label: "Постановщик", value: task.authorName ?? "—" },
    {
      label: "Создана",
      value: (
        <time dateTime={task.created_at}>
          {new Date(task.created_at).toLocaleDateString("ru-RU", {
            dateStyle: "long",
          })}
        </time>
      ),
    },
  ];

  return (
    <aside
      aria-label="Свойства задачи"
      className="bg-muted min-w-0 rounded-lg border px-4"
    >
      <dl className="divide-y">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-2 py-3"
          >
            <dt>
              <Typography
                as={TYPOGRAPHY_AS.SPAN}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                color={TYPOGRAPHY_COLOR.SECONDARY}
                className="font-medium"
              >
                {label}
              </Typography>
            </dt>
            <dd className="wrap-anywhere">
              <Typography
                as={TYPOGRAPHY_AS.SPAN}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              >
                {value}
              </Typography>
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
