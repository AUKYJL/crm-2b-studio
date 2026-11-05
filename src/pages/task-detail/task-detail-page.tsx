import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui/typography";

export function TaskDetailPage() {
  return (
    <Typography as={TYPOGRAPHY_AS.H1} variant={TYPOGRAPHY_VARIANT.H3}>
      Задача
    </Typography>
  );
}
