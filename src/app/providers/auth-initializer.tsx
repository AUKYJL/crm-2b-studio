import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/shared/api/supabase";

import { USER_ROLE, useAuthStore } from "@/features/auth/auth-store";

export function AuthInitializer() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      const current = useAuthStore.getState();
      if (nextUser && current.user?.id === nextUser.id) return;

      if (current.user) queryClient.clear();
      useAuthStore.setState({
        // Keep a distinct reference for each sign-in, even for the same account.
        user: nextUser && { ...nextUser },
        profile: null,
        isLoading: nextUser !== null,
        error: null,
      });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    if (!user || !isLoading) return;

    const controller = new AbortController();

    async function loadProfile(userId: string) {
      let profile = null;
      let message = null;

      try {
        const { data, error, status } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", userId)
          .abortSignal(controller.signal)
          .retry(false)
          .maybeSingle();

        if (error && (status === 0 || status >= 500)) throw error;
        if (error || !data || !Object.values(USER_ROLE).includes(data.role)) {
          message = "Профиль недоступен. Обратитесь к администратору.";
        } else {
          profile = data;
        }
      } catch {
        message =
          "Не удалось загрузить профиль. Проверьте подключение и повторите попытку.";
      }

      if (controller.signal.aborted || useAuthStore.getState().user !== user) {
        return;
      }

      useAuthStore.setState({ profile, isLoading: false, error: message });
    }

    loadProfile(user.id);
    return () => controller.abort();
  }, [user, isLoading]);

  return null;
}
