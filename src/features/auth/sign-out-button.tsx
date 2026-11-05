import { LogOut } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/shared/api/supabase";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    setPending(true);
    setFailed(false);

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      setFailed(Boolean(error));
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={BUTTON_VARIANT.GHOST}
        size={BUTTON_SIZE.SM}
        disabled={pending}
        onClick={handleSignOut}
      >
        <LogOut aria-hidden="true" className="size-4" />
        {pending ? "Выход…" : "Выйти"}
      </Button>
      {failed && (
        <Typography
          as={TYPOGRAPHY_AS.P}
          variant={TYPOGRAPHY_VARIANT.CAPTION}
          color={TYPOGRAPHY_COLOR.DANGER}
          role="alert"
        >
          Не удалось выйти. Проверьте подключение и повторите попытку.
        </Typography>
      )}
    </div>
  );
}
