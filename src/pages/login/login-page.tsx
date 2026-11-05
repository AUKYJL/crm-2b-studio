import { Link } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { Button } from "@/shared/ui/button";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

export function LoginPage() {
  return (
    <main className="bg-muted grid min-h-dvh place-items-center">
      <section className="bg-card w-full max-w-sm space-y-4 rounded-lg border p-8">
        <Typography as={TYPOGRAPHY_AS.H1} variant={TYPOGRAPHY_VARIANT.H3}>
          Вход в СтройКонтроль
        </Typography>
        <Typography
          as={TYPOGRAPHY_AS.P}
          variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
          color={TYPOGRAPHY_COLOR.SECONDARY}
        >
          Демо-режим
        </Typography>
        <Button asChild>
          <Link to={ROUTERS.OBJECTS}>Открыть CRM</Link>
        </Button>
      </section>
    </main>
  );
}
