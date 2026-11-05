import { Building2, ListTodo } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { cn } from "@/shared/lib/cn";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

const links = [
  { to: ROUTERS.OBJECTS, label: "Объекты", icon: Building2 },
  { to: ROUTERS.MY_TASKS, label: "Мои задачи", icon: ListTodo },
];

export function AppLayout() {
  return (
    <div className="flex min-h-dvh">
      <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 flex h-dvh w-56 shrink-0 flex-col border-r p-3">
        <div className="mb-6 flex items-center gap-2 px-2 py-2">
          <span className="bg-sidebar-primary text-sidebar-primary-foreground grid size-7 place-items-center rounded-md">
            <Building2 aria-hidden="true" className="size-4" />
          </span>
          <Typography as={TYPOGRAPHY_AS.SPAN} variant={TYPOGRAPHY_VARIANT.H6}>
            СтройКонтроль
          </Typography>
        </div>
        <nav aria-label="Разделы CRM" className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "hover:bg-sidebar-accent focus-visible:ring-sidebar-ring flex h-10 items-center gap-3 rounded-lg px-3 font-medium focus-visible:ring-2 focus-visible:outline-none",
                  isActive &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )
              }
            >
              <Icon aria-hidden="true" className="size-4" />
              <Typography
                as={TYPOGRAPHY_AS.SPAN}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                color={TYPOGRAPHY_COLOR.INHERIT}
                className="font-medium"
              >
                {label}
              </Typography>
            </NavLink>
          ))}
        </nav>
        <footer className="border-sidebar-border mt-auto flex items-center gap-3 border-t px-2 pt-4 pb-3">
          <span
            aria-hidden="true"
            className="bg-sidebar-accent grid size-9 place-items-center rounded-full"
          >
            <Typography
              as={TYPOGRAPHY_AS.SPAN}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
              className="font-semibold"
            >
              ИП
            </Typography>
          </span>
          <div>
            <Typography
              as={TYPOGRAPHY_AS.P}
              variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              className="font-semibold"
            >
              Иван Петров
            </Typography>
            <Typography
              as={TYPOGRAPHY_AS.P}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
              color={TYPOGRAPHY_COLOR.SECONDARY}
            >
              Исполнитель · демо
            </Typography>
          </div>
        </footer>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
