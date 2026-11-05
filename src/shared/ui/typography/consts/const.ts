export const TYPOGRAPHY_AS = {
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  H5: "h5",
  H6: "h6",
  P: "p",
  SPAN: "span",
  DIV: "div",
  LABEL: "label",
  STRONG: "strong",
  SMALL: "small",
} as const;

export type TypographyAs = (typeof TYPOGRAPHY_AS)[keyof typeof TYPOGRAPHY_AS];

export const TYPOGRAPHY_VARIANT = {
  H1: "h1",
  H2: "h2",
  H3: "h3",
  H4: "h4",
  H5: "h5",
  H6: "h6",
  SUBTITLE: "subtitle",
  BODY: "body",
  BODY_SMALL: "bodySmall",
  CAPTION: "caption",
  OVERLINE: "overline",
} as const;

export type TypographyVariant =
  (typeof TYPOGRAPHY_VARIANT)[keyof typeof TYPOGRAPHY_VARIANT];

export const TYPOGRAPHY_COLOR = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  MUTED: "muted",
  DISABLED: "disabled",
  ACCENT: "accent",
  DANGER: "danger",
  SUCCESS: "success",
  INHERIT: "inherit",
  ON_LIGHT: "on_light",
} as const;

export type TypographyColor =
  (typeof TYPOGRAPHY_COLOR)[keyof typeof TYPOGRAPHY_COLOR];
