import type { VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

/**
 * A link that looks like a button.
 *
 * It applies `buttonVariants` to a real `<a>` rather than handing an anchor to
 * Base UI's `Button` through `render`. That matters for semantics: Base UI's
 * `Button` assumes a native `<button>`, and setting `nativeButton={false}` makes
 * it *impose* button behaviour on the element — `role="button"` plus a Space-key
 * handler. A navigation control should stay a link: announced as a link, opened
 * in a new tab with the usual modifiers, and activated with Enter alone.
 *
 * Use this whenever a button-shaped control navigates. Use `Button` when it
 * performs an action.
 */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
