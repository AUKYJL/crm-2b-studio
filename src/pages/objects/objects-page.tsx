import { Plus, Search } from "lucide-react";
import { useRef, useState } from "react";

import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import { ObjectsTable } from "./ui/objects-table";
import {
  USER_ROLE,
  type UserRole,
  useAuthStore,
} from "@/features/auth/auth-store";
import { ArchiveObjectDialog } from "@/features/objects/archive-object-dialog";
import { ObjectFormDialog } from "@/features/objects/object-form-dialog";
import {
  type ObjectListItem,
  useObjects,
} from "@/features/objects/objects-api";

type ObjectDialog =
  { type: "create" } | { type: "edit" | "archive"; object: ObjectListItem };

export function ObjectsPage() {
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return null;

  return (
    <ObjectsList key={profile.id} userId={profile.id} role={profile.role} />
  );
}

function ObjectsList({ userId, role }: { userId: string; role: UserRole }) {
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<ObjectDialog>();
  const searchInput = useRef<HTMLInputElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement>(null);
  const objectsQuery = useObjects(userId, role);
  const canManage = role === USER_ROLE.MANAGER;
  const term = search.trim().toLocaleLowerCase("ru-RU");
  const objects = objectsQuery.data?.filter(
    ({ name, address }) =>
      name.toLocaleLowerCase("ru-RU").includes(term) ||
      address.toLocaleLowerCase("ru-RU").includes(term),
  );

  function closeDialog() {
    setDialog(undefined);
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    (dialogTrigger.current?.isConnected
      ? dialogTrigger.current
      : searchInput.current
    )?.focus();
  }

  return (
    <section className="space-y-6" aria-labelledby="objects-heading">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Typography
            id="objects-heading"
            as={TYPOGRAPHY_AS.H1}
            variant={TYPOGRAPHY_VARIANT.H3}
          >
            Объекты
          </Typography>
          <Typography as={TYPOGRAPHY_AS.P} color={TYPOGRAPHY_COLOR.SECONDARY}>
            Строительные объекты компании
          </Typography>
        </div>
        {canManage && (
          <Button
            type="button"
            onClick={(event) => {
              dialogTrigger.current = event.currentTarget;
              setDialog({ type: "create" });
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            Создать объект
          </Button>
        )}
      </header>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          ref={searchInput}
          type="search"
          aria-label="Поиск по названию или адресу"
          placeholder="Поиск по названию или адресу"
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {objectsQuery.isPending ? (
        <div role="status" aria-label="Загрузка объектов">
          <Spinner className="mt-0" />
        </div>
      ) : objectsQuery.isError ? (
        <div className="space-y-3 rounded-lg border px-4 py-8 text-center">
          <Typography
            as={TYPOGRAPHY_AS.P}
            role="alert"
            color={TYPOGRAPHY_COLOR.DANGER}
          >
            Не удалось загрузить объекты.
          </Typography>
          <Button
            type="button"
            variant={BUTTON_VARIANT.OUTLINE}
            disabled={objectsQuery.isFetching}
            onClick={() => void objectsQuery.refetch()}
          >
            {objectsQuery.isFetching ? "Загрузка…" : "Повторить"}
          </Button>
        </div>
      ) : objects?.length ? (
        <ObjectsTable
          objects={objects}
          onAction={
            canManage
              ? (type, object, trigger) => {
                  dialogTrigger.current = trigger;
                  setDialog({ type, object });
                }
              : undefined
          }
        />
      ) : (
        <Typography
          as={TYPOGRAPHY_AS.P}
          role="status"
          color={TYPOGRAPHY_COLOR.SECONDARY}
          className="rounded-lg border px-4 py-8 text-center"
        >
          {term && objectsQuery.data?.length
            ? "По вашему запросу ничего не найдено."
            : "Нет доступных объектов."}
        </Typography>
      )}
      {canManage &&
        dialog &&
        (dialog.type === "archive" ? (
          <ArchiveObjectDialog
            object={dialog.object}
            onClose={closeDialog}
            onCloseAutoFocus={restoreFocus}
          />
        ) : (
          <ObjectFormDialog
            object={dialog.type === "edit" ? dialog.object : undefined}
            onClose={closeDialog}
            onCloseAutoFocus={restoreFocus}
          />
        ))}
    </section>
  );
}
