import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appConfig } from "@/config/app";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  /** The "or do the other thing" line under the form. */
  footer?: ReactNode;
}

/** Shared frame for the login, register and password-reset screens. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <Link
          href="/"
          className="font-heading text-2xl text-gradient-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {appConfig.name.toUpperCase()} Tasks
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>{children}</CardContent>
      </Card>

      {footer ? (
        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      ) : null}
    </div>
  );
}
