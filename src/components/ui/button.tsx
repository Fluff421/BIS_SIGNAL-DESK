import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 text-sm font-medium transition-opacity duration-150 disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg rounded-sm hover:opacity-90",
        ghost: "bg-transparent text-fg rounded-sm hover:bg-elevated",
        outline: "border border-border text-fg rounded-sm hover:bg-elevated",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({
  className,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
