import { cva, type VariantProps } from "class-variance-authority";

// Enhanced button variants using our design system
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-strong hover:scale-105",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:shadow-strong",
        outline: "border border-border bg-background shadow-soft hover:bg-accent hover:text-accent-foreground hover:shadow-strong",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/80 hover:shadow-strong",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom variants for our chatbox
        primary: "bg-chat-gradient text-primary-foreground shadow-soft hover:shadow-strong hover:scale-105 font-medium",
        hero: "bg-primary-gradient-start text-primary-foreground shadow-strong hover:shadow-strong hover:scale-110 hover:bg-primary-gradient-end font-semibold text-base px-6 py-3",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;