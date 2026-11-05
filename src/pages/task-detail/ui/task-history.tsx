import { cn } from "@/shared/lib/cn";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import type { UserRole } from "@/features/auth/auth-store";
import { taskStatuses } from "@/features/task-status/statuses";
import { useTaskHistory } from "@/features/tasks/task-detail-api";

export function TaskHistory({
  id,
  userId,
  role,
}: {
  id: string;
  userId: string;
  role: UserRole;
}) {
  const history = useTaskHistory(id, userId, role);

  return (
    <section
      aria-labelledby="task-history-title"
      className="space-y-4 border-t pt-6"
    >
      <Typography
        as={TYPOGRAPHY_AS.H2}
        variant={TYPOGRAPHY_VARIANT.H4}
        id="task-history-title"
      >
        История
      </Typography>
      {history.isPending && (
        <div role="status" aria-label="Загрузка истории">
          <Spinner className="mt-0" />
        </div>
      )}
      {history.isError && (
        <div className="space-y-3">
          <Typography
            as={TYPOGRAPHY_AS.P}
            color={TYPOGRAPHY_COLOR.DANGER}
            role="alert"
          >
            Не удалось загрузить историю.
          </Typography>
          <Button
            variant={BUTTON_VARIANT.OUTLINE}
            disabled={history.isFetching}
            onClick={() => void history.refetch()}
          >
            Повторить
          </Button>
        </div>
      )}
      {history.isSuccess &&
        (history.data.events.length === 0 ? (
          <Typography as={TYPOGRAPHY_AS.P} color={TYPOGRAPHY_COLOR.SECONDARY}>
            В истории пока нет событий.
          </Typography>
        ) : (
          <ol aria-label="События задачи">
            {history.data.events.map((event, index) => {
              const actor =
                history.data.names.get(event.actor_id) ?? "Пользователь";
              const from =
                event.from_status && taskStatuses[event.from_status].label;
              const to = event.to_status && taskStatuses[event.to_status].label;
              const oldAssignee =
                (event.old_assignee_id &&
                  history.data.names.get(event.old_assignee_id)) ??
                "—";
              const newAssignee =
                (event.new_assignee_id &&
                  history.data.names.get(event.new_assignee_id)) ??
                "—";

              return (
                <li
                  key={event.id}
                  className="before:bg-border relative space-y-1 pb-5 pl-7 wrap-anywhere before:absolute before:top-2 before:bottom-0 before:left-1 before:w-px last:pb-0 last:before:hidden"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "bg-background absolute top-1.5 left-0 size-2.5 rounded-full border",
                      index === 0 && "border-primary bg-primary",
                    )}
                  />
                  <Typography
                    as={TYPOGRAPHY_AS.P}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    className="font-medium"
                  >
                    {actor}
                  </Typography>
                  <Typography
                    as={TYPOGRAPHY_AS.P}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                  >
                    {event.type === "created" && `Создание задачи · ${to}`}
                    {event.type === "status_changed" && `${from} → ${to}`}
                    {event.type === "assignee_changed" &&
                      `Смена исполнителя · ${oldAssignee} → ${newAssignee}`}
                  </Typography>
                  {event.comment && (
                    <Typography
                      as={TYPOGRAPHY_AS.P}
                      variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                      className="bg-muted mt-2 rounded-md px-3 py-2 whitespace-pre-wrap"
                    >
                      {event.comment}
                    </Typography>
                  )}
                  <Typography
                    as={TYPOGRAPHY_AS.P}
                    variant={TYPOGRAPHY_VARIANT.CAPTION}
                    color={TYPOGRAPHY_COLOR.SECONDARY}
                  >
                    <time dateTime={event.created_at}>
                      {new Date(event.created_at).toLocaleString("ru-RU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </Typography>
                </li>
              );
            })}
          </ol>
        ))}
    </section>
  );
}
