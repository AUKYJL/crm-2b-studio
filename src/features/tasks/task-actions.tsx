import { Archive, Pencil } from "lucide-react";
import { type MouseEvent, useRef, useState } from "react";

import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { TaskActionDialog, type TaskDialogMode } from "./task-action-dialog";
import {
  type TaskDetail,
  taskMutationError,
  type useTaskMutation,
} from "./task-detail-api";
import { USER_ROLE, type UserRole } from "@/features/auth/auth-store";

export function TaskActions({
  task,
  userId,
  role,
  mutation,
}: {
  task: TaskDetail;
  userId: string;
  role: UserRole;
  mutation: ReturnType<typeof useTaskMutation>;
}) {
  const [dialog, setDialog] = useState<{
    mode: TaskDialogMode;
    task: TaskDetail;
  }>();
  const trigger = useRef<HTMLButtonElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const { error, isPending, mutate, reset } = mutation;
  const manager = role === USER_ROLE.MANAGER;
  const assignedExecutor =
    role === USER_ROLE.EXECUTOR && userId === task.assignee_id;

  if (
    !isPending &&
    ((dialog?.mode === "rework" && task.status !== "in_review") ||
      (dialog?.mode === "reassign" &&
        (task.status === "accepted" ||
          dialog.task.assignee_id !== task.assignee_id)))
  ) {
    setDialog(undefined);
  }

  function open(mode: TaskDialogMode, event: MouseEvent<HTMLButtonElement>) {
    reset();
    trigger.current = event.currentTarget;
    setDialog({ mode, task });
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    if (trigger.current?.isConnected) trigger.current.focus();
    else actions.current?.focus();
  }

  return (
    <div className="space-y-3" ref={actions} tabIndex={-1}>
      <div className="flex flex-wrap gap-2">
        {assignedExecutor &&
          (task.status === "new" || task.status === "rework") && (
            <Button
              disabled={isPending}
              onClick={() =>
                mutate({
                  type: "transition",
                  from: task.status,
                  to: "in_progress",
                })
              }
            >
              {task.status === "new" ? "Взять в работу" : "Продолжить работу"}
            </Button>
          )}
        {assignedExecutor && task.status === "in_progress" && (
          <Button
            disabled={isPending}
            onClick={() =>
              mutate({ type: "transition", from: task.status, to: "in_review" })
            }
          >
            Отправить на проверку
          </Button>
        )}
        {manager && task.status === "in_review" && (
          <>
            <Button
              disabled={isPending}
              onClick={() =>
                mutate({
                  type: "transition",
                  from: task.status,
                  to: "accepted",
                })
              }
            >
              Принять задачу
            </Button>
            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              disabled={isPending}
              onClick={(event) => open("rework", event)}
            >
              Вернуть на доработку
            </Button>
          </>
        )}
        {manager && (
          <>
            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              disabled={isPending}
              onClick={(event) => open("edit", event)}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Редактировать
            </Button>
            {task.status !== "accepted" && (
              <Button
                variant={BUTTON_VARIANT.OUTLINE}
                disabled={isPending}
                onClick={(event) => open("reassign", event)}
              >
                Сменить исполнителя
              </Button>
            )}
            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              disabled={isPending}
              onClick={(event) => open("archive", event)}
            >
              <Archive aria-hidden="true" className="size-4" />
              Архивировать
            </Button>
          </>
        )}
      </div>
      {!dialog && error && (
        <Typography
          as={TYPOGRAPHY_AS.P}
          variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
          color={TYPOGRAPHY_COLOR.DANGER}
          role="alert"
        >
          {taskMutationError(error)}
        </Typography>
      )}
      {dialog && (
        <TaskActionDialog
          mode={dialog.mode}
          userId={userId}
          task={dialog.task}
          isPending={isPending}
          error={error}
          onSubmit={(change) =>
            mutate(change, { onSuccess: () => setDialog(undefined) })
          }
          onClose={() => setDialog(undefined)}
          onCloseAutoFocus={restoreFocus}
        />
      )}
    </div>
  );
}
