"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { endpoints } from "@/lib/api-client";
import { toHebrewMessage } from "@/lib/errors/messages.he";
import { queryKeys } from "@/lib/query/keys";
import type { ConnectTelegramInput } from "@/lib/schemas";
import { toast } from "@/lib/toast";
import type { TelegramIntegrationStatus } from "@/types";

import { useApiFetch, useAuth } from "./use-auth";

/**
 * The Telegram integration, from the browser's side.
 *
 * A plain `useQuery` rather than the realtime pattern the rest of the app uses.
 * The `integrations` collection is denied to clients in `firestore.rules` — it
 * holds a sealed bot token — so there is no `onSnapshot` to subscribe to, and
 * every read goes through `GET /api/v1/integrations/telegram`, which returns a
 * status projection with no field a token could occupy.
 *
 * Each mutation writes the fresh status straight into the cache: the endpoints
 * return the new state, so refetching after a save would be a second round-trip
 * for an answer already in hand.
 */

function useIntegrationKey() {
  const { user } = useAuth();
  return queryKeys.telegramIntegration(user?.uid ?? "anonymous");
}

export function useTelegramIntegration() {
  const apiFetch = useApiFetch();
  const { user } = useAuth();
  const key = useIntegrationKey();

  return useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: () =>
      apiFetch<TelegramIntegrationStatus>(endpoints.telegramIntegration(), {}),
    // A bot connection changes only when this screen changes it, and every
    // mutation seeds the cache — so background refetching would be pure noise.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useConnectTelegram() {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  const key = useIntegrationKey();

  return useMutation({
    mutationFn: (input: ConnectTelegramInput) =>
      apiFetch<TelegramIntegrationStatus>(endpoints.telegramIntegration(), {
        method: "POST",
        body: input,
      }),

    onSuccess: (status) => {
      queryClient.setQueryData(key, status);
      toast.success("הבוט חובר בהצלחה.");
    },
    // Field-level errors (a malformed token) are rendered by the form from
    // `error.details`; the toast covers everything else.
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}

export function useTestTelegramConnection() {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  const key = useIntegrationKey();

  return useMutation({
    mutationFn: () =>
      apiFetch<TelegramIntegrationStatus>(endpoints.telegramIntegrationTest(), {
        method: "POST",
      }),

    onSuccess: (status) => {
      queryClient.setQueryData(key, status);

      toast.success(
        status.linkState === "linked"
          ? "החיבור תקין. נשלחה הודעת בדיקה לבוט."
          : "ה-Token תקין. נותר לשלוח לבוט את קוד החיבור.",
      );
    },
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}

export function useDisconnectTelegram() {
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();
  const key = useIntegrationKey();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ disconnected: true }>(endpoints.telegramIntegration(), {
        method: "DELETE",
      }),

    onSuccess: () => {
      queryClient.setQueryData<TelegramIntegrationStatus>(key, {
        connected: false,
        botUsername: null,
        botName: null,
        linkState: "unlinked",
        webhookRegistered: false,
        webhookMessage: null,
        linkCode: null,
        connectedAt: null,
        updatedAt: null,
      });

      toast.success("הבוט נותק.");
    },
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}
