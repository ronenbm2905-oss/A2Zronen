"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks";
import { toHebrewAuthMessage } from "@/lib/errors/messages.he";
import { toast } from "@/lib/toast";

/** Account menu in the topbar: who you are, settings, sign out. */
export function UserMenu() {
  const { user, signOutUser } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.replace("/");
    } catch (error) {
      toast.error(toHebrewAuthMessage(error));
    }
  };

  const name = user?.displayName?.trim() || user?.email || "משתמש";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="תפריט המשתמש">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium">{name}</span>
          {user?.email ? (
            <span
              className="truncate text-xs font-normal text-muted-foreground"
              dir="ltr"
            >
              {user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* `nativeButton={false}` because the item renders an anchor: without it
            Base UI applies button semantics and keyboard handling to a link. */}
        <DropdownMenuItem nativeButton={false} render={<Link href="/settings" />}>
          <Settings aria-hidden />
          הגדרות
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut aria-hidden />
          התנתקות
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Up to two initials. Falls back to a person glyph for an address that begins
 * with a digit or symbol, where a letterless "initial" would look like a bug.
 */
function initials(name: string): React.ReactNode {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]).join("");

  return /\p{L}/u.test(letters) ? (
    letters.toUpperCase()
  ) : (
    <User className="size-3.5" aria-hidden />
  );
}
