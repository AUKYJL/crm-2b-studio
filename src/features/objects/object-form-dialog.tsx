import { type FormEvent, useId, useState } from "react";

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
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import {
  type ObjectListItem,
  objectMutationError,
  useObjectMutation,
} from "./objects-api";

type ObjectFormDialogProps = {
  object?: Pick<ObjectListItem, "id" | "name" | "address">;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

export function ObjectFormDialog({
  object,
  onClose,
  onCloseAutoFocus,
}: ObjectFormDialogProps) {
  const fieldId = useId();
  const [nameError, setNameError] = useState(false);
  const { mutate, isPending, error, reset } = useObjectMutation();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    if (!name) {
      setNameError(true);
      e.currentTarget.querySelector("input")?.focus();
      return;
    }

    const fields = { name, address };
    mutate(
      object
        ? { type: "update", id: object.id, fields }
        : { type: "create", fields },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <div className="space-y-1">
          <DialogTitle asChild>
            <Typography as={TYPOGRAPHY_AS.H2} variant={TYPOGRAPHY_VARIANT.H5}>
              {object ? "Редактировать объект" : "Создать объект"}
            </Typography>
          </DialogTitle>
          <DialogDescription asChild>
            <Typography
              as={TYPOGRAPHY_AS.P}
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            >
              Укажите название и адрес строительного объекта.
            </Typography>
          </DialogDescription>
        </div>
        <form
          className="space-y-4"
          onSubmit={submit}
          onChange={() => error && reset()}
        >
          <div className="space-y-1.5">
            <Typography
              as={TYPOGRAPHY_AS.LABEL}
              htmlFor={fieldId}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-medium"
            >
              Название
            </Typography>
            <Input
              id={fieldId}
              name="name"
              required
              defaultValue={object?.name}
              readOnly={isPending}
              aria-invalid={nameError || undefined}
              aria-describedby={nameError ? `${fieldId}-error` : undefined}
              onChange={() => setNameError(false)}
            />
            {nameError && (
              <Typography
                as={TYPOGRAPHY_AS.P}
                id={`${fieldId}-error`}
                role="alert"
                color={TYPOGRAPHY_COLOR.DANGER}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              >
                Введите название объекта.
              </Typography>
            )}
          </div>
          <div className="space-y-1.5">
            <Typography
              as={TYPOGRAPHY_AS.LABEL}
              htmlFor={`${fieldId}-address`}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-medium"
            >
              Адрес
            </Typography>
            <Input
              id={`${fieldId}-address`}
              name="address"
              defaultValue={object?.address}
              readOnly={isPending}
            />
          </div>
          {error && (
            <Typography
              as={TYPOGRAPHY_AS.P}
              role="alert"
              color={TYPOGRAPHY_COLOR.DANGER}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            >
              {objectMutationError(
                error,
                "Не удалось сохранить объект. Повторите попытку.",
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохранение…" : object ? "Сохранить" : "Создать"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
