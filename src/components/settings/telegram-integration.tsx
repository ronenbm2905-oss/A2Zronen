"use client";

import {
  CheckCircle2,
  Copy,
  Link2Off,
  PlugZap,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { ConfirmDialog, FormField, SubmitButton } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConfirm,
  useConnectTelegram,
  useDisconnectTelegram,
  useTelegramIntegration,
  useTestTelegramConnection,
  useZodForm,
} from "@/hooks";
import { connectTelegramSchema, type ConnectTelegramInput } from "@/lib/schemas";
import { toast } from "@/lib/toast";
import type { TelegramIntegrationStatus } from "@/types";

/**
 * Connect a Telegram bot to this account.
 *
 * The token field is **write-only**, and the UI says so. `GET` returns a status
 * projection with no token in it, so there is nothing to prefill — a masked
 * value would imply the app can read the secret back, which it deliberately
 * cannot.
 *
 * Connecting is two steps, and the card shows exactly which one is outstanding:
 *
 * 1. save the token — proves the bot belongs to the user;
 * 2. send `/start <code>` to the bot — proves the *chat* does.
 *
 * Step 2 exists because a bot is publicly addressable by anyone who knows its
 * handle. Without it, holding the token would authorize a stranger's messages.
 */
export function TelegramIntegration() {
  const { data: status, isLoading, isError } = useTelegramIntegration();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-primary-strong" aria-hidden />
          חיבור ל-Telegram
        </CardTitle>
        <CardDescription>
          חבר בוט משלך ונהל את המשימות בשיחה טבעית, ישירות מ-Telegram.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-40" />
          </div>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            לא ניתן לטעון את מצב החיבור. רענן את הדף ונסה שוב.
          </p>
        ) : (
          <TelegramPanel status={status ?? null} />
        )}
      </CardContent>
    </Card>
  );
}

function TelegramPanel({ status }: { status: TelegramIntegrationStatus | null }) {
  const connect = useConnectTelegram();
  const test = useTestTelegramConnection();
  const disconnect = useDisconnectTelegram();

  const disconnectConfirm = useConfirm<true>(() => disconnect.mutateAsync());

  const form = useZodForm({
    schema: connectTelegramSchema,
    initialValues: { botToken: "" } as ConnectTelegramInput,
    onSubmit: async (values) => {
      await connect.mutateAsync(values);
      // Clear on success so the secret does not linger in a DOM node — and so a
      // second save cannot resubmit a token the user has already replaced.
      form.reset({ botToken: "" });
    },
  });

  const isConnected = status?.connected ?? false;

  return (
    <div className="space-y-5">
      {status?.connected ? (
        <ConnectionSummary status={status} />
      ) : (
        <SetupSteps />
      )}

      <form onSubmit={form.submit} noValidate className="space-y-4">
        <FormField
          label={isConnected ? "החלפת Bot Token" : "Bot Token"}
          error={form.errors.botToken}
          required={!isConnected}
          hint={
            isConnected
              ? "ה-Token השמור אינו מוצג מטעמי אבטחה. הזן Token חדש רק אם ברצונך להחליף בוט."
              : "פתח שיחה עם @BotFather ב-Telegram, שלח /newbot, והעתק לכאן את ה-Token שקיבלת."
          }
        >
          {(field) => (
            <Input
              {...field}
              type="password"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              placeholder="123456789:AAF…"
              value={form.values.botToken}
              onChange={(event) => form.setValue("botToken", event.target.value)}
            />
          )}
        </FormField>

        {form.formError ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <SubmitButton
            variant="strong"
            isPending={connect.isPending || form.isSubmitting}
            pendingLabel="מאמת מול Telegram…"
          >
            <PlugZap data-icon="inline-start" aria-hidden />
            {isConnected ? "שמירת Token חדש" : "שמירה"}
          </SubmitButton>

          <Button
            type="button"
            variant="outline"
            disabled={!isConnected || test.isPending}
            onClick={() => test.mutate()}
          >
            <CheckCircle2 data-icon="inline-start" aria-hidden />
            {test.isPending ? "בודק…" : "בדיקת חיבור"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            disabled={!isConnected || disconnect.isPending}
            onClick={() => disconnectConfirm.ask(true)}
          >
            <Link2Off data-icon="inline-start" aria-hidden />
            ניתוק הבוט
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={disconnectConfirm.isOpen}
        onOpenChange={disconnectConfirm.close}
        title="לנתק את הבוט?"
        description={
          <>
            ה-Token יימחק מהשרת, ה-Webhook יוסר מ-Telegram והיסטוריית השיחה עם
            העוזר תימחק. המשימות עצמן לא ייפגעו. אפשר לחבר בוט מחדש בכל עת.
          </>
        }
        confirmLabel="ניתוק"
        isPending={disconnectConfirm.isPending}
        onConfirm={disconnectConfirm.confirm}
      />
    </div>
  );
}

function ConnectionSummary({ status }: { status: TelegramIntegrationStatus }) {
  const isLinked = status.linkState === "linked";

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isLinked ? "success" : "warning"}>
          {isLinked ? "מחובר ופעיל" : "ממתין לחיבור הצ׳אט"}
        </Badge>

        {status.botUsername ? (
          <span className="text-sm text-muted-foreground" dir="ltr">
            @{status.botUsername}
          </span>
        ) : null}

        {status.webhookRegistered ? (
          <Badge variant="ghost">Webhook רשום</Badge>
        ) : (
          <Badge variant="secondary">Webhook לא רשום</Badge>
        )}
      </div>

      {status.linkCode ? <LinkCode code={status.linkCode} /> : null}

      {status.webhookMessage ? (
        <p className="flex gap-2 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>{status.webhookMessage}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * The `/start` code, with a copy button.
 *
 * Shown only while the chat is unlinked — the code is single-use, and leaving it
 * on screen afterwards would suggest it still does something.
 */
function LinkCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const command = `/start ${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard access is denied over plain HTTP and in some embedded views;
      // the code is selectable on screen either way.
      toast.error("לא ניתן להעתיק אוטומטית. סמן והעתק ידנית.");
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm">
        שלב אחרון: פתח שיחה עם הבוט שלך ב-Telegram ושלח לו את ההודעה הבאה.
      </p>

      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
        >
          {command}
        </code>

        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          <Copy data-icon="inline-start" aria-hidden />
          {copied ? "הועתק" : "העתקה"}
        </Button>
      </div>
    </div>
  );
}

function SetupSteps() {
  return (
    <ol className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <li>
        <span className="font-medium text-foreground">1.</span> פתח ב-Telegram
        שיחה עם <span dir="ltr">@BotFather</span> ושלח <code>/newbot</code>.
      </li>
      <li>
        <span className="font-medium text-foreground">2.</span> בחר שם ו-username
        לבוט, והעתק את ה-Token שתקבל.
      </li>
      <li>
        <span className="font-medium text-foreground">3.</span> הדבק אותו כאן
        ולחץ «שמירה» — נאמת אותו מול Telegram.
      </li>
      <li>
        <span className="font-medium text-foreground">4.</span> שלח לבוט את קוד
        החיבור שיוצג כאן, וזהו.
      </li>
    </ol>
  );
}
