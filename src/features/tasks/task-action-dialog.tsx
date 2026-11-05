import { type FormEvent, useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import {
  type TaskChange,
  type TaskDetail,
  taskMutationError,
} from "./task-detail-api";
import { useExecutors } from "./tasks-api";
import { USER_ROLE } from "@/features/auth/auth-store";
import { useObjects } from "@/features/objects/objects-api";

const copy = {
  edit: {
    title: "Редактировать задачу",
    description: "Измените название, описание или объект задачи.",
    submit: "Сохранить",
  },
  rework: {
    title: "Вернуть на доработку",
    description: "Укажите, что исполнителю нужно исправить.",
    submit: "Вернуть на доработку",
  },
  reassign: {
    title: "Сменить исполнителя",
    description: "Выберите другого исполнителя. Статус задачи сохранится.",
    submit: "Переназначить",
  },
};

export type TaskDialogMode = keyof typeof copy | "archive";

type DialogProps = {
  task: TaskDetail;
  isPending: boolean;
  error: Error | null;
  onSubmit: (change: TaskChange) => void;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

export function TaskActionDialog({
  mode,
  userId,
  ...props
}: DialogProps & { mode: TaskDialogMode; userId: string }) {
  if (mode === "archive") return <ArchiveTaskDialog {...props} />;
  return <TaskFormDialog mode={mode} userId={userId} {...props} />;
}

function TaskFormDialog({
  mode,
  userId,
  task,
  isPending,
  error,
  onSubmit,
  onClose,
  onCloseAutoFocus,
}: DialogProps & { mode: keyof typeof copy; userId: string }) {
  const id = useId();
  const [selection, setSelection] = useState(
    mode === "edit" ? task.object.id : "",
  );
  const [validation, setValidation] = useState("");
  const labels = copy[mode];
  const objects = useObjects(userId, USER_ROLE.MANAGER, mode === "edit");
  const executors = useExecutors(userId, mode === "reassign");
  const targetQuery = mode === "edit" ? objects : executors;
  const options =
    mode === "edit"
      ? (objects.data ?? [])
      : (executors.data
          ?.filter(({ id }) => id !== task.assignee_id)
          .map(({ id, full_name }) => ({ id, name: full_name })) ?? []);
  const targetValue = options.some(({ id }) => id === selection)
    ? selection
    : "";
  const canSubmit =
    mode === "rework" || (targetQuery.isSuccess && !!targetValue);
  const targetPlaceholder = targetQuery.isPending
    ? "Загрузка…"
    : targetQuery.isError
      ? "Ошибка загрузки"
      : options.length
        ? "Выберите из списка"
        : "Нет доступных вариантов";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !canSubmit) return;
    const fields = new FormData(event.currentTarget);
    const text = String(fields.get("text") ?? "").trim();

    if (mode === "rework") {
      if (!text) return setValidation("Введите комментарий к доработке.");
      onSubmit({
        type: "transition",
        from: task.status,
        to: "rework",
        comment: text,
      });
    } else if (mode === "edit") {
      if (!text) return setValidation("Введите название задачи.");
      onSubmit({
        type: "edit",
        title: text,
        description: String(fields.get("description") ?? "").trim(),
        objectId: selection,
      });
    } else {
      onSubmit({ type: "reassign", from: task.assignee_id, to: selection });
    }
    setValidation("");
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <div className="space-y-1">
          <DialogTitle asChild>
            <Typography as={TYPOGRAPHY_AS.H2} variant={TYPOGRAPHY_VARIANT.H5}>
              {labels.title}
            </Typography>
          </DialogTitle>
          <DialogDescription asChild>
            <Typography
              as={TYPOGRAPHY_AS.P}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              color={TYPOGRAPHY_COLOR.SECONDARY}
            >
              {labels.description}
            </Typography>
          </DialogDescription>
        </div>
        <form
          noValidate
          onSubmit={submit}
          onChange={() => setValidation("")}
          className="space-y-4"
        >
          {mode === "edit" && (
            <div className="space-y-1.5">
              <FieldLabel id={`${id}-title`}>Название</FieldLabel>
              <Input
                id={`${id}-title`}
                name="text"
                defaultValue={task.title}
                readOnly={isPending}
                required
              />
            </div>
          )}
          {mode !== "reassign" && (
            <div className="space-y-1.5">
              <FieldLabel id={`${id}-notes`}>
                {mode === "edit" ? "Описание" : "Комментарий"}
              </FieldLabel>
              <textarea
                id={`${id}-notes`}
                name={mode === "edit" ? "description" : "text"}
                defaultValue={mode === "edit" ? task.description : ""}
                readOnly={isPending}
                required={mode === "rework"}
                rows={4}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              />
            </div>
          )}
          {mode !== "rework" && (
            <div className="space-y-1.5">
              <FieldLabel id={`${id}-target`}>
                {mode === "edit" ? "Объект" : "Исполнитель"}
              </FieldLabel>
              <Select
                value={targetValue}
                onValueChange={(value) => {
                  setSelection(value);
                  setValidation("");
                }}
                disabled={
                  isPending || !targetQuery.isSuccess || !options.length
                }
              >
                <SelectTrigger id={`${id}-target`} className="w-full">
                  <SelectValue placeholder={targetPlaceholder} />
                </SelectTrigger>
                <SelectContent className="max-w-(--radix-select-trigger-width)">
                  {options.map(({ id, name }) => (
                    <SelectItem key={id} value={id} className="wrap-anywhere">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetQuery.isError && (
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.OUTLINE}
                  disabled={isPending || targetQuery.isFetching}
                  onClick={() => void targetQuery.refetch()}
                >
                  Повторить загрузку
                </Button>
              )}
            </div>
          )}
          {(validation || error) && (
            <ActionError>
              {validation || (error && taskMutationError(error))}
            </ActionError>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                disabled={isPending}
              >
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? "Сохранение…" : labels.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({ id, children }: { id: string; children: string }) {
  return (
    <Typography
      as={TYPOGRAPHY_AS.LABEL}
      htmlFor={id}
      variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
      className="block font-medium"
    >
      {children}
    </Typography>
  );
}

function ArchiveTaskDialog({
  isPending,
  error,
  onSubmit,
  onClose,
  onCloseAutoFocus,
}: DialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <div className="space-y-1">
          <AlertDialogTitle asChild>
            <Typography as={TYPOGRAPHY_AS.H2} variant={TYPOGRAPHY_VARIANT.H5}>
              Архивировать задачу?
            </Typography>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <Typography
              as={TYPOGRAPHY_AS.P}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              color={TYPOGRAPHY_COLOR.SECONDARY}
            >
              Задача будет скрыта из рабочих списков.
            </Typography>
          </AlertDialogDescription>
        </div>
        {error && <ActionError>{taskMutationError(error)}</ActionError>}
        <div className="flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant={BUTTON_VARIANT.OUTLINE}
              disabled={isPending}
            >
              Отмена
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant={BUTTON_VARIANT.DESTRUCTIVE}
            disabled={isPending}
            onClick={() => onSubmit({ type: "archive" })}
          >
            {isPending ? "Архивирование…" : "Архивировать"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActionError({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      as={TYPOGRAPHY_AS.P}
      variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
      color={TYPOGRAPHY_COLOR.DANGER}
      role="alert"
    >
      {children}
    </Typography>
  );
}
