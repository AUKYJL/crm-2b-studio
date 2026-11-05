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

import { USER_ROLE, useAuthStore } from "@/features/auth/auth-store";
import { SignOutButton } from "@/features/auth/sign-out-button";

const links = [
  { to: ROUTERS.OBJECTS, label: "Объекты", icon: Building2 },
  {
    to: ROUTERS.MY_TASKS,
    label: "Мои задачи",
    icon: ListTodo,
    executorOnly: true,
  },
];

export function AppLayout() {
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return null;

  const { full_name, role } = profile;
  const initials = full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const visibleLinks = links.filter(
    (link) => !link.executorOnly || role === USER_ROLE.EXECUTOR,
  );

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
          {visibleLinks.map(({ to, label, icon: Icon }) => (
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
        <footer className="border-sidebar-border mt-auto space-y-2 border-t px-2 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-sidebar-accent grid size-9 shrink-0 place-items-center rounded-full"
            >
              <Typography
                as={TYPOGRAPHY_AS.SPAN}
                variant={TYPOGRAPHY_VARIANT.CAPTION}
                className="font-semibold"
              >
                {initials}
              </Typography>
            </span>
            <div className="min-w-0">
              <Typography
                as={TYPOGRAPHY_AS.P}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                className="truncate font-semibold"
                title={full_name}
              >
                {full_name}
              </Typography>
              <Typography
                as={TYPOGRAPHY_AS.P}
                variant={TYPOGRAPHY_VARIANT.CAPTION}
                color={TYPOGRAPHY_COLOR.SECONDARY}
              >
                {role === USER_ROLE.MANAGER ? "Постановщик" : "Исполнитель"}
              </Typography>
            </div>
          </div>
          <SignOutButton />
        </footer>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
