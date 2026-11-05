import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { type SubmitEvent, useState } from "react";

import { supabase } from "@/shared/api/supabase";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");

    setPending(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) return;
      if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) {
        throw error;
      }

      if (error.code === "invalid_credentials") {
        setError("Неверный email или пароль.");
      } else if (error.status === 429) {
        setError("Слишком много попыток. Попробуйте немного позже.");
      } else {
        setError(
          "Не удалось войти. Проверьте данные или обратитесь к администратору.",
        );
      }
    } catch {
      setError(
        "Не удалось подключиться. Проверьте подключение и повторите попытку.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="bg-muted grid min-h-dvh place-items-center">
      <section className="bg-card w-full max-w-md space-y-6 rounded-lg border p-6">
        <header className="flex items-center gap-4">
          <span className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-lg">
            <Building2 aria-hidden="true" className="size-6" />
          </span>
          <div>
            <Typography as={TYPOGRAPHY_AS.P} variant={TYPOGRAPHY_VARIANT.H4}>
              СтройКонтроль
            </Typography>
            <Typography
              as={TYPOGRAPHY_AS.P}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
              color={TYPOGRAPHY_COLOR.SECONDARY}
            >
              Система управления объектами и задачами
            </Typography>
          </div>
        </header>
        <div className="space-y-4">
          <Typography as={TYPOGRAPHY_AS.H1} variant={TYPOGRAPHY_VARIANT.H3}>
            Вход в систему
          </Typography>
          <form
            className="space-y-4"
            onSubmit={handleSubmit}
            aria-busy={pending}
          >
            <div className="space-y-1">
              <Typography
                as={TYPOGRAPHY_AS.LABEL}
                htmlFor="email"
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                className="block font-medium"
              >
                Email
              </Typography>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1">
              <Typography
                as={TYPOGRAPHY_AS.LABEL}
                htmlFor="password"
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                className="block font-medium"
              >
                Пароль
              </Typography>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.GHOST}
                  className="absolute inset-y-1 right-1 h-8 w-9 p-0"
                  aria-label={
                    showPassword ? "Скрыть пароль" : "Показать пароль"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <Typography
                as={TYPOGRAPHY_AS.P}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                color={TYPOGRAPHY_COLOR.DANGER}
                role="alert"
              >
                {error}
              </Typography>
            )}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending && (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              )}
              {pending ? "Входим…" : "Войти"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
