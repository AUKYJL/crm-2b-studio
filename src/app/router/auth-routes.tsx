import { Navigate, Outlet } from "react-router-dom";

import { LoginPage } from "@/pages/login/login-page";

import { ROUTERS } from "@/shared/constants/routers";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { TYPOGRAPHY_AS, Typography } from "@/shared/ui/typography";

import {
  USER_ROLE,
  type UserRole,
  useAuthStore,
} from "@/features/auth/auth-store";
import { SignOutButton } from "@/features/auth/sign-out-button";

const homeByRole = {
  [USER_ROLE.MANAGER]: ROUTERS.OBJECTS,
  [USER_ROLE.EXECUTOR]: ROUTERS.MY_TASKS,
} satisfies Record<UserRole, string>;

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { profile, isLoading, error } = useAuthStore();

  if (isLoading || error) return <AuthFeedback error={error} />;
  if (!profile) return <Navigate to={ROUTERS.LOGIN} replace />;

  if (role && profile.role !== role) {
    return <Navigate to={homeByRole[profile.role]} replace />;
  }

  return <Outlet key={profile.id} />;
}

export function LoginRoute() {
  const { profile, isLoading, error } = useAuthStore();

  if (isLoading || error) return <AuthFeedback error={error} />;

  return profile ? (
    <Navigate to={homeByRole[profile.role]} replace />
  ) : (
    <LoginPage />
  );
}

export function HomeRedirect() {
  const profile = useAuthStore((state) => state.profile);
  return profile && <Navigate to={homeByRole[profile.role]} replace />;
}

function AuthFeedback({ error }: { error: string | null }) {
  if (!error) {
    return (
      <main
        className="bg-muted grid min-h-dvh place-items-center"
        role="status"
        aria-label="Проверяем доступ"
      >
        <Spinner className="mt-0" />
      </main>
    );
  }

  return (
    <main className="bg-muted grid min-h-dvh place-items-center">
      <section className="bg-card w-full max-w-sm space-y-4 rounded-lg border p-6">
        <Typography as={TYPOGRAPHY_AS.P} role="alert">
          {error}
        </Typography>
        <div className="flex items-start gap-2">
          <Button
            onClick={() =>
              useAuthStore.setState({ isLoading: true, error: null })
            }
          >
            Повторить
          </Button>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
