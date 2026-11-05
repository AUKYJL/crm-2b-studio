import { Link, generatePath, useParams } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { TaskHistory } from "./ui/task-history";
import { TaskProperties } from "./ui/task-properties";
import {
  USER_ROLE,
  type UserRole,
  useAuthStore,
} from "@/features/auth/auth-store";
import { TaskActions } from "@/features/tasks/task-actions";
import {
  taskMutationError,
  useTask,
  useTaskMutation,
} from "@/features/tasks/task-detail-api";

export function TaskDetailPage() {
  const { id = "" } = useParams();
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return null;

  return (
    <TaskDetail
      key={`${profile.id}:${profile.role}:${id}`}
      id={id}
      userId={profile.id}
      role={profile.role}
    />
  );
}

function TaskDetail({
  id,
  userId,
  role,
}: {
  id: string;
  userId: string;
  role: UserRole;
}) {
  const query = useTask(id, userId, role);
  const mutation = useTaskMutation(id);
  const archived = mutation.isSuccess && mutation.variables.type === "archive";
  const task = query.isSuccess && !archived ? query.data : null;
  const objectPath = task
    ? generatePath(ROUTERS.OBJECT_DETAIL, { id: task.object.id })
    : ROUTERS.OBJECTS;
  const manager = role === USER_ROLE.MANAGER;
  const breadcrumbs = [
    manager
      ? { label: "Объекты", to: ROUTERS.OBJECTS }
      : { label: "Мои задачи", to: ROUTERS.MY_TASKS },
    ...(manager && task ? [{ label: task.object.name, to: objectPath }] : []),
  ];

  return (
    <div className="space-y-6">
      <nav aria-label="Навигационная цепочка">
        <ol className="flex flex-wrap items-baseline gap-2">
          {breadcrumbs.map(({ label, to }) => (
            <li key={to} className="flex min-w-0 items-baseline gap-2">
              <Link
                to={to}
                className="text-muted-foreground wrap-anywhere hover:underline"
              >
                <Typography
                  as={TYPOGRAPHY_AS.SPAN}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                  color={TYPOGRAPHY_COLOR.INHERIT}
                >
                  {label}
                </Typography>
              </Link>
              {task && (
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
              )}
            </li>
          ))}
          {task && (
            <li aria-current="page" className="min-w-0 wrap-anywhere">
              <Typography
                as={TYPOGRAPHY_AS.SPAN}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              >
                {task.title}
              </Typography>
            </li>
          )}
        </ol>
      </nav>
      {!task && mutation.error && (
        <Typography
          as={TYPOGRAPHY_AS.P}
          color={TYPOGRAPHY_COLOR.DANGER}
          role="alert"
        >
          {taskMutationError(mutation.error)}
        </Typography>
      )}
      {archived ? (
        <Typography
          as={TYPOGRAPHY_AS.H1}
          variant={TYPOGRAPHY_VARIANT.H4}
          className="rounded-lg border px-4 py-8 text-center"
        >
          Задача архивирована
        </Typography>
      ) : query.isPending ? (
        <div role="status" aria-label="Загрузка задачи">
          <Spinner className="mt-0" />
        </div>
      ) : query.isError ? (
        <div className="space-y-3 rounded-lg border px-4 py-8 text-center">
          <Typography
            as={TYPOGRAPHY_AS.P}
            color={TYPOGRAPHY_COLOR.DANGER}
            role="alert"
          >
            Не удалось загрузить задачу.
          </Typography>
          <Button
            variant={BUTTON_VARIANT.OUTLINE}
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Повторить
          </Button>
        </div>
      ) : task ? (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(17rem,24rem)] items-start gap-8">
          <div className="min-w-0 space-y-6">
            <header className="space-y-4">
              <Typography
                as={TYPOGRAPHY_AS.H1}
                variant={TYPOGRAPHY_VARIANT.H3}
                className="wrap-anywhere"
              >
                {task.title}
              </Typography>
              {task.description && (
                <Typography
                  as={TYPOGRAPHY_AS.P}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  className="wrap-anywhere whitespace-pre-wrap"
                >
                  {task.description}
                </Typography>
              )}
              <TaskActions
                task={task}
                userId={userId}
                role={role}
                mutation={mutation}
              />
            </header>
            <TaskHistory id={id} userId={userId} role={role} />
          </div>
          <TaskProperties task={task} objectPath={objectPath} />
        </div>
      ) : (
        <Typography
          as={TYPOGRAPHY_AS.H1}
          variant={TYPOGRAPHY_VARIANT.H4}
          className="rounded-lg border px-4 py-8 text-center"
        >
          Задача не найдена или нет доступа
        </Typography>
      )}
    </div>
  );
}
