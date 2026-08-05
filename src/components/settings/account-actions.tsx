"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks";
import { toHebrewAuthMessage } from "@/lib/errors/messages.he";
import { toast } from "@/lib/toast";

/** Sign out. Clears the query cache so the next user starts with nothing. */
export function AccountActions() {
  const { signOutUser } = useAuth();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSignOut = async () => {
    setIsPending(true);

    try {
      await signOutUser();
      router.replace("/");
    } catch (error) {
      toast.error(toHebrewAuthMessage(error));
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>חשבון</CardTitle>
        <CardDescription>
          התנתקות תסיים את ההתחברות במכשיר הזה בלבד.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button variant="outline" onClick={handleSignOut} disabled={isPending}>
          <LogOut data-icon="inline-start" aria-hidden />
          {isPending ? "מתנתק…" : "התנתקות"}
        </Button>
      </CardContent>
    </Card>
  );
}
