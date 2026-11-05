import { Archive, Ellipsis, Pencil } from "lucide-react";
import { useRef } from "react";
import { Link, generatePath } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

import type { ObjectListItem } from "@/features/objects/objects-api";

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const taskPlural = new Intl.PluralRules("ru-RU");
const taskWord: Record<Intl.LDMLPluralRule, string> = {
  one: "задача",
  few: "задачи",
  many: "задач",
  other: "задачи",
  zero: "задач",
  two: "задачи",
};

type ObjectAction = "edit" | "archive";
type OnObjectAction = (
  action: ObjectAction,
  object: ObjectListItem,
  trigger: HTMLButtonElement | null,
) => void;

function ObjectMenu({
  object,
  onAction,
}: {
  object: ObjectListItem;
  onAction: OnObjectAction;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedAction = useRef<ObjectAction>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          type="button"
          variant={BUTTON_VARIANT.OUTLINE}
          size={BUTTON_SIZE.ICON}
          className="size-8"
          aria-label={`Действия с объектом «${object.name}»`}
        >
          <Ellipsis aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          const action = selectedAction.current;
          if (action) {
            event.preventDefault();
            selectedAction.current = null;
            onAction(action, object, trigger.current);
          }
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            selectedAction.current = "edit";
          }}
        >
          <Pencil aria-hidden="true" />
          <Typography
            as={TYPOGRAPHY_AS.SPAN}
            variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            color={TYPOGRAPHY_COLOR.INHERIT}
          >
            Редактировать
          </Typography>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => {
            selectedAction.current = "archive";
          }}
        >
          <Archive aria-hidden="true" />
          <Typography
            as={TYPOGRAPHY_AS.SPAN}
            variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
            color={TYPOGRAPHY_COLOR.INHERIT}
          >
            Архивировать
          </Typography>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ObjectsTable({
  objects,
  onAction,
}: {
  objects: ObjectListItem[];
  onAction?: OnObjectAction;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table className="table-fixed" aria-label="Список объектов">
        <TableHeader className="bg-muted">
          <TableRow>
            {[
              { label: "Название", width: "w-[30%]" },
              { label: "Адрес", width: "w-[30%]" },
              { label: "Задач", width: "w-[14%]" },
              { label: "Изменён", width: "" },
            ].map(({ label, width }) => (
              <TableHead
                key={label}
                scope="col"
                className={`h-11 px-4 ${width}`}
              >
                <Typography
                  as={TYPOGRAPHY_AS.SPAN}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  className="font-medium"
                >
                  {label}
                </Typography>
              </TableHead>
            ))}
            {onAction && (
              <TableHead scope="col" aria-label="Действия" className="w-16" />
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((object) => (
            <TableRow key={object.id} className="h-14">
              <TableCell className="px-4 whitespace-normal">
                <Link
                  to={generatePath(ROUTERS.OBJECT_DETAIL, { id: object.id })}
                  className="focus-visible:ring-ring rounded-sm wrap-anywhere hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Typography
                    as={TYPOGRAPHY_AS.SPAN}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    color={TYPOGRAPHY_COLOR.INHERIT}
                    className="font-semibold"
                  >
                    {object.name}
                  </Typography>
                </Link>
              </TableCell>
              <TableCell className="px-4 whitespace-normal">
                <Typography
                  as={TYPOGRAPHY_AS.SPAN}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  className="wrap-anywhere"
                >
                  {object.address || "—"}
                </Typography>
              </TableCell>
              <TableCell className="px-4">
                <Typography
                  as={TYPOGRAPHY_AS.SPAN}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                >
                  {object.taskCount}{" "}
                  {taskWord[taskPlural.select(object.taskCount)]}
                </Typography>
              </TableCell>
              <TableCell className="px-4">
                <time dateTime={object.updated_at}>
                  <Typography
                    as={TYPOGRAPHY_AS.SPAN}
                    variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    color={TYPOGRAPHY_COLOR.SECONDARY}
                  >
                    {dateTime.format(new Date(object.updated_at))}
                  </Typography>
                </time>
              </TableCell>
              {onAction && (
                <TableCell className="px-4 text-right">
                  <ObjectMenu object={object} onAction={onAction} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
