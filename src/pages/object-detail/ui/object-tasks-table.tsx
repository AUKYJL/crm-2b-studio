import { Link, generatePath } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
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

import { TaskStatusBadge } from "@/features/task-status/task-status-badge";
import type { TaskListItem } from "@/features/tasks/tasks-api";

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ObjectTasksTable({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="table-fixed" aria-label="Задачи объекта">
        <TableHeader className="bg-muted">
          <TableRow>
            {["Задача", "Статус", "Исполнитель", "Создана"].map(
              (label, index) => (
                <TableHead
                  key={label}
                  scope="col"
                  className={index === 0 ? "h-11 w-[34%] px-4" : "h-11 px-4"}
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
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="h-14">
              <TableCell className="px-4 whitespace-normal">
                <Link
                  to={generatePath(ROUTERS.TASK_DETAIL, { id: task.id })}
                  className="focus-visible:ring-ring rounded-sm wrap-anywhere hover:underline focus-visible:ring-2 focus-visible:outline-none"
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
              <TableCell className="px-4">
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell className="px-4 whitespace-normal">
                <Typography
                  as={TYPOGRAPHY_AS.SPAN}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                  className="wrap-anywhere"
                >
                  {task.assignee?.full_name ?? "—"}
                </Typography>
              </TableCell>
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
