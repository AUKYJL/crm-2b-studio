import { cva } from "class-variance-authority";

export const BUTTON_VARIANT = {
  DEFAULT: "default",
  SECONDARY: "secondary",
  OUTLINE: "outline",
  GHOST: "ghost",
  DESTRUCTIVE: "destructive",
} as const;

export type ButtonVariant =
  (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export const BUTTON_SIZE = {
  DEFAULT: "default",
  SM: "sm",
  LG: "lg",
  ICON: "icon",
} as const;

export type ButtonSize = (typeof BUTTON_SIZE)[keyof typeof BUTTON_SIZE];

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        [BUTTON_VARIANT.DEFAULT]:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        [BUTTON_VARIANT.SECONDARY]:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        [BUTTON_VARIANT.OUTLINE]:
          "border border-border bg-background text-foreground hover:bg-accent",
        [BUTTON_VARIANT.GHOST]:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        [BUTTON_VARIANT.DESTRUCTIVE]:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        [BUTTON_SIZE.DEFAULT]: "h-10 px-4 py-2",
        [BUTTON_SIZE.SM]: "h-9 px-3",
        [BUTTON_SIZE.LG]: "h-11 px-5",
        [BUTTON_SIZE.ICON]: "size-10",
      },
    },
    defaultVariants: {
      variant: BUTTON_VARIANT.DEFAULT,
      size: BUTTON_SIZE.DEFAULT,
    },
  },
);
