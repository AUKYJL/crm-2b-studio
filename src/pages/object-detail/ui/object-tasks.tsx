import { Search } from "lucide-react";
import { useState } from "react";

import { Constants } from "@/shared/api/database.types";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import type { UserRole } from "@/features/auth/auth-store";
import { taskStatuses } from "@/features/task-status/statuses";
import { useObjectTasks } from "@/features/tasks/tasks-api";
import { TasksTable } from "@/features/tasks/tasks-table";

export function ObjectTasks({
  objectId,
  userId,
  role,
}: {
  objectId: string;
  userId: string;
  role: UserRole;
}) {
  const query = useObjectTasks(objectId, userId, role);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase("ru-RU");
  const tasks = query.data?.filter(
    (task) =>
      (status === "all" || task.status === status) &&
      task.title.toLocaleLowerCase("ru-RU").includes(term),
  );

  return (
    <section className="space-y-5" aria-labelledby="object-tasks-heading">
      <div className="flex items-center justify-between gap-4">
        <Typography
          as={TYPOGRAPHY_AS.H2}
          id="object-tasks-heading"
          variant={TYPOGRAPHY_VARIANT.H4}
        >
          Задачи{query.isSuccess && ` (${query.data.length})`}
        </Typography>
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Фильтр по статусу" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Constants.public.Enums.task_status.map((status) => (
                <SelectItem key={status} value={status}>
                  {taskStatuses[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-72">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              aria-label="Поиск по задачам"
              placeholder="Поиск по задачам"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>
      {query.isPending ? (
        <div role="status" aria-label="Загрузка задач">
          <Spinner className="mt-0" />
        </div>
      ) : query.isError ? (
        <div className="space-y-3 rounded-lg border px-4 py-8 text-center">
          <Typography
            as={TYPOGRAPHY_AS.P}
            role="alert"
            color={TYPOGRAPHY_COLOR.DANGER}
          >
            Не удалось загрузить задачи.
          </Typography>
          <Button
            type="button"
            variant={BUTTON_VARIANT.OUTLINE}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Повторить
          </Button>
        </div>
      ) : tasks?.length ? (
        <TasksTable view="object" tasks={tasks} />
      ) : (
        <Typography
          as={TYPOGRAPHY_AS.P}
          role="status"
          color={TYPOGRAPHY_COLOR.SECONDARY}
          className="rounded-lg border px-4 py-8 text-center"
        >
          {query.data.length
            ? "По выбранным фильтрам задач нет."
            : "В этом объекте пока нет задач."}
        </Typography>
      )}
    </section>
  );
}
