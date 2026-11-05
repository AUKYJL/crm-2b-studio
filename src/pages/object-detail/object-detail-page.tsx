import { MapPin, Pencil, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { ObjectTasks } from "./ui/object-tasks";
import {
  USER_ROLE,
  type UserRole,
  useAuthStore,
} from "@/features/auth/auth-store";
import { ObjectFormDialog } from "@/features/objects/object-form-dialog";
import { useObject } from "@/features/objects/objects-api";
import { CreateTaskDialog } from "@/features/tasks/create-task-dialog";

export function ObjectDetailPage() {
  const { id = "" } = useParams();
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return null;

  return (
    <ObjectDetail
      key={`${profile.id}:${profile.role}:${id}`}
      id={id}
      userId={profile.id}
      role={profile.role}
    />
  );
}

function ObjectDetail({
  id,
  userId,
  role,
}: {
  id: string;
  userId: string;
  role: UserRole;
}) {
  const query = useObject(id, userId, role);
  const object = query.isSuccess ? query.data : null;
  const [dialog, setDialog] = useState<"edit" | "create-task">();
  const dialogTrigger = useRef<HTMLButtonElement>(null);
  const canManage = role === USER_ROLE.MANAGER;

  function closeDialog() {
    setDialog(undefined);
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    dialogTrigger.current?.focus();
  }

  return (
    <div className="space-y-6">
      <nav
        aria-label="Навигационная цепочка"
        className="flex items-baseline gap-2"
      >
        <Link
          to={ROUTERS.OBJECTS}
          className="text-muted-foreground hover:underline"
        >
          <Typography
            as={TYPOGRAPHY_AS.SPAN}
            variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            color={TYPOGRAPHY_COLOR.INHERIT}
          >
            Объекты
          </Typography>
        </Link>
        {object && (
          <>
            <span aria-hidden="true" className="text-muted-foreground">
              /
            </span>
            <Typography
              as={TYPOGRAPHY_AS.SPAN}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              aria-current="page"
              className="wrap-anywhere"
            >
              {object.name}
            </Typography>
          </>
        )}
      </nav>
      {query.isPending ? (
        <div role="status" aria-label="Загрузка объекта">
          <Spinner className="mt-0" />
        </div>
      ) : query.isError ? (
        <div className="space-y-3 rounded-lg border px-4 py-8 text-center">
          <Typography
            as={TYPOGRAPHY_AS.P}
            role="alert"
            color={TYPOGRAPHY_COLOR.DANGER}
          >
            Не удалось загрузить объект.
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
      ) : object ? (
        <>
          <header className="flex items-start justify-between gap-6 border-b pb-6">
            <div className="min-w-0 space-y-2">
              <Typography
                as={TYPOGRAPHY_AS.H1}
                variant={TYPOGRAPHY_VARIANT.H3}
                className="wrap-anywhere"
              >
                {object.name}
              </Typography>
              <Typography
                as={TYPOGRAPHY_AS.P}
                color={TYPOGRAPHY_COLOR.SECONDARY}
                className="flex items-center gap-2 wrap-anywhere"
              >
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                {object.address || "Адрес не указан"}
              </Typography>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.OUTLINE}
                  onClick={(event) => {
                    dialogTrigger.current = event.currentTarget;
                    setDialog("edit");
                  }}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Редактировать
                </Button>
                <Button
                  type="button"
                  onClick={(event) => {
                    dialogTrigger.current = event.currentTarget;
                    setDialog("create-task");
                  }}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Новая задача
                </Button>
              </div>
            )}
          </header>
          <ObjectTasks objectId={object.id} userId={userId} role={role} />
          {canManage && dialog === "edit" && (
            <ObjectFormDialog
              object={object}
              onClose={closeDialog}
              onCloseAutoFocus={restoreFocus}
            />
          )}
          {canManage && dialog === "create-task" && (
            <CreateTaskDialog
              object={object}
              userId={userId}
              onClose={closeDialog}
              onCloseAutoFocus={restoreFocus}
            />
          )}
        </>
      ) : (
        <Typography
          as={TYPOGRAPHY_AS.H1}
          variant={TYPOGRAPHY_VARIANT.H4}
          className="rounded-lg border px-4 py-8 text-center"
        >
          Объект не найден или нет доступа
        </Typography>
      )}
    </div>
  );
}
