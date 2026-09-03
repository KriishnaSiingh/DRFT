import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { isValidCardId, deviceTypeFromUserAgent } from "@/lib/qr-config";

/**
 * Public QR scan endpoint — /q/:id
 *
 * Physical QR codes are printed with:
 *   https://drftreviews.vercel.app/q/001 ... https://drftreviews.vercel.app/q/050
 *
 * Flow:
 *  1. Validate card ID format (001–050).
 *  2. Check card status in Supabase. If inactive or no URL, return null (go to /unassigned).
 *  3. If active, log the scan via RPC and issue HTTP 307 redirect immediately.
 *  4. Fallback client-side redirect in component with useEffect.
 */

const resolveCard = createServerFn({ method: "GET" })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }) => {
    if (!isValidCardId(id)) {
      return { destination: null, error: "invalid_id" };
    }

    const ua = getRequestHeader("user-agent") ?? null;
    const deviceType = deviceTypeFromUserAgent(ua);

    // 1. Direct check from Supabase qr_cards table
    try {
      const { data: card, error: cardError } = await supabase
        .from("qr_cards")
        .select("destination_url, status")
        .eq("id", id)
        .maybeSingle();

      if (!cardError && card) {
        // Strict check: if card is NOT active, DO NOT redirect
        if (card.status !== "active" || !card.destination_url) {
          return { destination: null, error: "inactive" };
        }

        // Card is active: log the scan in background and return destination
        Promise.resolve(
          supabase.rpc("resolve_and_log_scan", {
            p_card_id: id,
            p_device_type: deviceType,
            p_user_agent: ua,
          }),
        )
          .then(({ error }) => {
            if (error) {
              console.error("[q.$id] resolve_and_log_scan error:", error.message);
            }
          })
          .catch((err: unknown) => {
            console.error("[q.$id] RPC catch:", err);
          });

        return { destination: card.destination_url, error: null };
      }
    } catch (e) {
      console.error("[q.$id] DB query failed:", e);
    }

    // 2. If direct check didn't return a card, call resolve_and_log_scan RPC
    try {
      const { data, error } = await supabase.rpc("resolve_and_log_scan", {
        p_card_id: id,
        p_device_type: deviceType,
        p_user_agent: ua,
      });

      if (!error && data) {
        return { destination: data as string, error: null };
      }
    } catch (e) {
      console.error("[q.$id] RPC failed:", e);
    }

    // Card is inactive, unassigned, or not found
    return { destination: null, error: "inactive" };
  });

export const Route = createFileRoute("/q/$id")({
  preload: false,
  loader: async ({ params }) => {
    if (!isValidCardId(params.id)) {
      throw redirect({ to: "/" });
    }

    const { destination } = await resolveCard({ data: params.id });

    if (destination) {
      throw redirect({ href: destination });
    }

    // When card is inactive or has no destination, redirect to /unassigned
    throw redirect({
      to: "/unassigned",
      search: { id: params.id },
    });
  },
  head: () => ({
    meta: [
      { title: "Redirecting to Google Reviews — DRFT" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedirectPage,
});

function RedirectPage() {
  const { destination } = Route.useLoaderData() as {
    destination: string | null;
    error: string | null;
  };
  const { id } = Route.useParams();

  useEffect(() => {
    if (destination) {
      window.location.replace(destination);
    } else {
      window.location.replace(`/unassigned?id=${encodeURIComponent(id)}`);
    }
  }, [destination, id]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="size-6 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
      <p className="mt-4 font-display text-lg font-semibold text-foreground">
        {destination ? "Redirecting…" : "Card Not Yet Active"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Card #{id}</p>
      {destination && (
        <a href={destination} className="mt-4 text-xs text-primary underline underline-offset-2">
          Click here if you are not redirected automatically
        </a>
      )}
    </div>
  );
}
