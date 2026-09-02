import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { isValidCardId, deviceTypeFromUserAgent, getDefaultReviewLink } from "@/lib/qr-config";

/**
 * Public QR scan endpoint — /q/:id
 *
 * Physical QR codes are printed with:
 *   https://drftreviews.vercel.app/q/001 ... https://drftreviews.vercel.app/q/020
 *
 * Flow:
 *  1. Validate card ID format (001–020).
 *  2. Resolve destination from Supabase (RPC resolve_and_log_scan or fallback direct lookup).
 *  3. Issue HTTP 307 redirect immediately (server-side).
 *  4. Fallback client-side redirect in component with <meta http-equiv="refresh">.
 */

const resolveCard = createServerFn({ method: "GET" })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }) => {
    if (!isValidCardId(id)) {
      return { destination: null, error: "invalid_id" };
    }

    const ua = getRequestHeader("user-agent") ?? null;
    const deviceType = deviceTypeFromUserAgent(ua);

    // 1. Call RPC resolve_and_log_scan to log scan & retrieve destination URL
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
      console.error("[q.$id] RPC resolve_and_log_scan failed:", e);
    }

    // 2. Fallback direct table query in case RPC wasn't created yet in DB
    try {
      const { data: card } = await supabase
        .from("qr_cards")
        .select("destination_url, status")
        .eq("id", id)
        .maybeSingle();

      if (card && card.status === "active" && card.destination_url) {
        return { destination: card.destination_url, error: null };
      }
    } catch (e) {
      console.error("[q.$id] direct query failed:", e);
    }

    // 3. Fallback to default Google Review link if card 001 or 002
    const defaultLink = getDefaultReviewLink(id);
    if (defaultLink) {
      return {
        destination: defaultLink.url,
        error: null,
      };
    }

    return { destination: null, error: "not_active" };
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
  const { destination, error } = Route.useLoaderData() as {
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
        Redirecting to Google Reviews…
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
