import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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

import { useCreateTask, useExecutors } from "./tasks-api";
import { objectMutationError } from "@/features/objects/objects-api";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Введите название задачи."),
  description: z.string().trim(),
  assigneeId: z.guid("Выберите исполнителя."),
});

type CreateTaskDialogProps = {
  object: { id: string; name: string };
  userId: string;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

const controlClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50";

export function CreateTaskDialog({
  object,
  userId,
  onClose,
  onCloseAutoFocus,
}: CreateTaskDialogProps) {
  const id = useId();
  const executors = useExecutors(userId);
  const { mutate, isPending, error, reset } = useCreateTask(object.id);
  const {
    control,
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", assigneeId: "" },
  });

  const canAssign = !executors.isError && !!executors.data?.length;
  const assigneePlaceholder = executors.isPending
    ? "Загрузка исполнителей…"
    : executors.isError
      ? "Не удалось загрузить исполнителей"
      : canAssign
        ? "Выберите исполнителя"
        : "Нет доступных исполнителей";

  function clearMutationError() {
    if (error) reset();
  }

  const submit = handleSubmit((fields) => {
    if (isPending || !canAssign) return;
    mutate(fields, {
      onSuccess: onClose,
      onError: (error) => {
        if ("code" in error && error.code === "22023") {
          resetField("assigneeId");
          void executors.refetch();
        }
      },
    });
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <div className="space-y-1">
          <DialogTitle asChild>
            <Typography as={TYPOGRAPHY_AS.H2} variant={TYPOGRAPHY_VARIANT.H5}>
              Новая задача
            </Typography>
          </DialogTitle>
          <DialogDescription asChild>
            <Typography
              as={TYPOGRAPHY_AS.P}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              color={TYPOGRAPHY_COLOR.SECONDARY}
              className="wrap-anywhere"
            >
              Создание задачи для объекта «{object.name}»
            </Typography>
          </DialogDescription>
        </div>
        <form noValidate className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Typography
              as={TYPOGRAPHY_AS.LABEL}
              htmlFor={`${id}-title`}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-medium"
            >
              Название
            </Typography>
            <Input
              id={`${id}-title`}
              required
              readOnly={isPending}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title && `${id}-title-error`}
              {...register("title", { onChange: clearMutationError })}
            />
            {errors.title && (
              <Typography
                as={TYPOGRAPHY_AS.P}
                id={`${id}-title-error`}
                role="alert"
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                color={TYPOGRAPHY_COLOR.DANGER}
              >
                {errors.title.message}
              </Typography>
            )}
          </div>
          <div className="space-y-1.5">
            <Typography
              as={TYPOGRAPHY_AS.LABEL}
              htmlFor={`${id}-description`}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-medium"
            >
              Описание
            </Typography>
            <textarea
              id={`${id}-description`}
              rows={3}
              readOnly={isPending}
              className={`${controlClass} min-h-20 py-2`}
              {...register("description", { onChange: clearMutationError })}
            />
          </div>
          <div className="space-y-1.5">
            <Typography
              as={TYPOGRAPHY_AS.LABEL}
              htmlFor={`${id}-object`}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-medium"
            >
              Объект
            </Typography>
            <Input
              id={`${id}-object`}
              value={object.name}
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Typography
              as={TYPOGRAPHY_AS.LABEL}
              htmlFor={`${id}-assignee`}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-medium"
            >
              Исполнитель
            </Typography>
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    clearMutationError();
                  }}
                  required
                  disabled={isPending || !canAssign}
                >
                  <SelectTrigger
                    ref={field.ref}
                    id={`${id}-assignee`}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.assigneeId}
                    aria-describedby={
                      errors.assigneeId && `${id}-assignee-error`
                    }
                    className="w-full"
                  >
                    <SelectValue placeholder={assigneePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {executors.data?.map((executor) => (
                      <SelectItem key={executor.id} value={executor.id}>
                        {executor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {executors.isError && (
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                disabled={executors.isFetching}
                onClick={() => void executors.refetch()}
              >
                Повторить загрузку
              </Button>
            )}
            {errors.assigneeId && (
              <Typography
                as={TYPOGRAPHY_AS.P}
                id={`${id}-assignee-error`}
                role="alert"
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                color={TYPOGRAPHY_COLOR.DANGER}
              >
                {errors.assigneeId.message}
              </Typography>
            )}
          </div>
          {error && (
            <Typography
              as={TYPOGRAPHY_AS.P}
              role="alert"
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              color={TYPOGRAPHY_COLOR.DANGER}
            >
              {"code" in error && error.code === "22023"
                ? "Исполнитель больше недоступен. Выберите другого."
                : objectMutationError(
                    error,
                    "Не удалось создать задачу. Повторите попытку.",
                  )}
            </Typography>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
                disabled={isPending}
              >
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !canAssign}>
              {isPending ? "Создание…" : "Создать задачу"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
