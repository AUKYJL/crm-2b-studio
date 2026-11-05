import {
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  type TypographyColor,
  type TypographyVariant,
} from "./const";

const typographyVariantClasses: Record<TypographyVariant, string> = {
  [TYPOGRAPHY_VARIANT.H1]:
    "text-[32px] leading-[40px] font-bold tracking-[-0.02em]",
  [TYPOGRAPHY_VARIANT.H2]:
    "text-[28px] leading-[36px] font-bold tracking-[-0.02em]",
  [TYPOGRAPHY_VARIANT.H3]:
    "text-[24px] leading-[32px] font-bold tracking-[-0.02em]",
  [TYPOGRAPHY_VARIANT.H4]: "text-[20px] leading-[28px] font-bold",
  [TYPOGRAPHY_VARIANT.H5]: "text-[18px] leading-6 font-semibold",
  [TYPOGRAPHY_VARIANT.H6]: "text-base leading-[22px] font-semibold",
  [TYPOGRAPHY_VARIANT.SUBTITLE]: "text-base leading-6 font-medium",
  [TYPOGRAPHY_VARIANT.BODY]: "text-[15px] leading-[22px] font-normal",
  [TYPOGRAPHY_VARIANT.BODY_SMALL]: "text-sm leading-5 font-normal",
  [TYPOGRAPHY_VARIANT.CAPTION]: "text-xs leading-4 font-normal",
  [TYPOGRAPHY_VARIANT.OVERLINE]:
    "text-[11px] leading-4 font-semibold tracking-[0.08em] uppercase",
};

const typographyColorClasses: Record<TypographyColor, string> = {
  [TYPOGRAPHY_COLOR.PRIMARY]: "text-foreground",
  [TYPOGRAPHY_COLOR.SECONDARY]: "text-muted-foreground",
  [TYPOGRAPHY_COLOR.MUTED]: "text-muted-foreground",
  [TYPOGRAPHY_COLOR.DISABLED]: "text-muted-foreground opacity-60",
  [TYPOGRAPHY_COLOR.ACCENT]: "text-primary",
  [TYPOGRAPHY_COLOR.DANGER]: "text-destructive",
  [TYPOGRAPHY_COLOR.SUCCESS]: "text-status-accepted",
  [TYPOGRAPHY_COLOR.INHERIT]: "text-inherit",
  [TYPOGRAPHY_COLOR.ON_LIGHT]: "text-foreground",
};

export { typographyColorClasses, typographyVariantClasses };
