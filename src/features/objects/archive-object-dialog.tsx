import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
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

type ArchiveObjectDialogProps = {
  object: Pick<ObjectListItem, "id" | "name">;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

export function ArchiveObjectDialog({
  object,
  onClose,
  onCloseAutoFocus,
}: ArchiveObjectDialogProps) {
  const { mutate, isPending, error } = useObjectMutation();

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <div className="space-y-1">
          <AlertDialogTitle asChild>
            <Typography as={TYPOGRAPHY_AS.H2} variant={TYPOGRAPHY_VARIANT.H5}>
              Архивировать объект?
            </Typography>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <Typography
              as={TYPOGRAPHY_AS.P}
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="wrap-anywhere"
            >
              Объект «{object.name}» и его задачи будут скрыты из рабочих
              списков.
            </Typography>
          </AlertDialogDescription>
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
              "Не удалось архивировать объект. Повторите попытку.",
            )}
          </Typography>
        )}
        <div className="flex justify-end gap-2 pt-2">
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
            onClick={() =>
              mutate({ type: "archive", id: object.id }, { onSuccess: onClose })
            }
          >
            {isPending ? "Архивирование…" : "Архивировать"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
