import { Link, generatePath } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { cn } from "@/shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import type { MyTaskListItem, TaskListItem } from "./tasks-api";
import { TaskStatusBadge } from "@/features/task-status/task-status-badge";

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

type TasksTableProps =
  | { view: "object"; tasks: TaskListItem[] }
  | { view: "assigned"; tasks: MyTaskListItem[] };

export function TasksTable({ view, tasks }: TasksTableProps) {
  const assigned = view === "assigned";
  const columns = assigned
    ? ["Задача", "Объект", "Статус", "Создана"]
    : ["Задача", "Статус", "Исполнитель", "Создана"];
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table
        className="table-fixed"
        aria-label={assigned ? "Мои задачи" : "Задачи объекта"}
      >
        <TableHeader className="bg-muted">
          <TableRow>
            {columns.map((label, index) => (
              <TableHead
                key={label}
                scope="col"
                className={cn("h-11 px-4", index === 0 && "w-[34%]")}
              >
                <Typography
                  as={TYPOGRAPHY_AS.SPAN}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  className="font-medium"
                >
                  {label}
                </Typography>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className={cn("h-14", assigned && "relative")}
            >
              <TableCell className="px-4 whitespace-normal">
                <Link
                  to={generatePath(ROUTERS.TASK_DETAIL, { id: task.id })}
                  className={cn(
                    "focus-visible:ring-ring rounded-sm wrap-anywhere hover:underline focus-visible:ring-2 focus-visible:outline-none",
                    assigned && "after:absolute after:inset-0",
                  )}
                >
                  <Typography
                    as={TYPOGRAPHY_AS.SPAN}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    color={TYPOGRAPHY_COLOR.INHERIT}
                    className="font-semibold"
                  >
                    {task.title}
                  </Typography>
                </Link>
              </TableCell>
              {"object" in task && (
                <TableCell className="px-4 whitespace-normal">
                  <Typography
                    as={TYPOGRAPHY_AS.SPAN}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    color={TYPOGRAPHY_COLOR.SECONDARY}
                    className="wrap-anywhere"
                  >
                    {task.object.name}
                  </Typography>
                </TableCell>
              )}
              <TableCell className="px-4">
                <TaskStatusBadge status={task.status} />
              </TableCell>
              {"assignee" in task && (
                <TableCell className="px-4 whitespace-normal">
                  <Typography
                    as={TYPOGRAPHY_AS.SPAN}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    className="wrap-anywhere"
                  >
                    {task.assignee?.full_name ?? "—"}
                  </Typography>
                </TableCell>
              )}
              <TableCell className="px-4">
                <time dateTime={task.created_at}>
                  <Typography
                    as={TYPOGRAPHY_AS.SPAN}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    color={TYPOGRAPHY_COLOR.SECONDARY}
                  >
                    {dateTime.format(new Date(task.created_at))}
                  </Typography>
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
