import { Link } from "react-router-dom";

import { ROUTERS } from "@/shared/constants/routers";
import { BUTTON_VARIANT, Button } from "@/shared/ui/button";
import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <Typography as={TYPOGRAPHY_AS.H1} variant={TYPOGRAPHY_VARIANT.H3}>
        Страница не найдена
      </Typography>
      <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
        <Link to={ROUTERS.OBJECTS}>К объектам</Link>
      </Button>
    </div>
  );
}
