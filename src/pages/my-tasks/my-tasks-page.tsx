import * as Tabs from "@radix-ui/react-tabs";
import { Search } from "lucide-react";
import { useState } from "react";

import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { useAuthStore } from "@/features/auth/auth-store";
import { taskStatuses } from "@/features/task-status/statuses";
import { useMyTasks } from "@/features/tasks/tasks-api";
import { TasksTable } from "@/features/tasks/tasks-table";

const tabs = {
  all: "Все",
  new: "Новые",
  in_progress: taskStatuses.in_progress.label,
  in_review: taskStatuses.in_review.label,
  rework: taskStatuses.rework.label,
  accepted: "Принятые",
};

export function MyTasksPage() {
  const userId = useAuthStore((state) => state.profile?.id);
  return userId && <MyTasks userId={userId} />;
}

function MyTasks({ userId }: { userId: string }) {
  const query = useMyTasks(userId);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase("ru-RU");
  const tasks = query.data?.filter(
    (task) =>
      (status === "all" || task.status === status) &&
      (task.title.toLocaleLowerCase("ru-RU").includes(term) ||
        task.object.name.toLocaleLowerCase("ru-RU").includes(term)),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Typography as={TYPOGRAPHY_AS.H1} variant={TYPOGRAPHY_VARIANT.H3}>
          Мои задачи
        </Typography>
        <Typography as={TYPOGRAPHY_AS.P} color={TYPOGRAPHY_COLOR.SECONDARY}>
          Задачи, назначенные вам
        </Typography>
      </header>

      <Tabs.Root value={status} onValueChange={setStatus} className="space-y-6">
        <Tabs.List aria-label="Статус задачи" className="flex gap-2 border-b">
          {Object.entries(tabs).map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring data-[state=active]:border-primary data-[state=active]:text-primary -mb-px cursor-pointer rounded-t-sm border-b-2 border-transparent px-3 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
            >
              <Typography
                as={TYPOGRAPHY_AS.SPAN}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                color={TYPOGRAPHY_COLOR.INHERIT}
                className="font-medium"
              >
                {label}
              </Typography>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={status} tabIndex={-1} className="space-y-6">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              aria-label="Поиск по задачам и объектам"
              placeholder="Поиск задач"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
            <TasksTable view="assigned" tasks={tasks} />
          ) : (
            <Typography
              as={TYPOGRAPHY_AS.P}
              role="status"
              color={TYPOGRAPHY_COLOR.SECONDARY}
              className="rounded-lg border px-4 py-8 text-center"
            >
              {query.data.length
                ? "По выбранным фильтрам задач нет."
                : "У вас пока нет назначенных задач."}
            </Typography>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
