import * as React from "react";

import { cn } from "@/shared/lib/cn";

import {
  TYPOGRAPHY_AS,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  type TypographyAs,
  type TypographyColor,
  type TypographyVariant,
  typographyColorClasses,
  typographyVariantClasses,
} from "./consts";

type TypographyOwnProps<T extends TypographyAs> = {
  as?: T;
  variant?: TypographyVariant;
  color?: TypographyColor;
};

type TypographyProps<T extends TypographyAs> = TypographyOwnProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof TypographyOwnProps<T>>;

type TypographyComponent = <T extends TypographyAs = typeof TYPOGRAPHY_AS.P>(
  props: TypographyProps<T> & { ref?: React.ComponentPropsWithRef<T>["ref"] },
) => React.ReactElement | null;

const TypographyPrimitive = React.forwardRef<
  HTMLElement,
  TypographyProps<TypographyAs>
>(function Typography(
  {
    as,
    variant = TYPOGRAPHY_VARIANT.BODY,
    color = TYPOGRAPHY_COLOR.PRIMARY,
    className,
    ...props
  },
  ref,
) {
  const Component = as ?? TYPOGRAPHY_AS.P;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(
      "m-0",
      typographyVariantClasses[variant],
      typographyColorClasses[color],
      className,
    ),
  });
});

TypographyPrimitive.displayName = "Typography";

const Typography = TypographyPrimitive as TypographyComponent;

export { Typography };
