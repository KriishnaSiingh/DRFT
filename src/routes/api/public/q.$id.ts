import { createServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";

import { supabase } from "@/lib/supabase";
import { isValidCardId, deviceTypeFromUserAgent } from "@/lib/qr-config";

/**
 * Public QR scan endpoint.
 *
 * Flow:
 *  1. Validate the card ID format (001–020).
 *  2. Call resolve_and_log_scan() — logs the scan, increments counter, returns destination URL.
 *  3. 302 → destination URL  |  302 → /unassigned  |  302 → / (invalid ID)
 *
 * This runs entirely server-side so no Supabase credentials are exposed to the browser.
 */
const resolveCard = createServerFn({ method: "GET" })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }) => {
    const ua = getRequestHeader("user-agent") ?? null;

    // Reject invalid IDs immediately
    if (!isValidCardId(id)) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    const deviceType = deviceTypeFromUserAgent(ua);

    const { data, error } = await supabase.rpc("resolve_and_log_scan", {
      p_card_id: id,
      p_device_type: deviceType,
      p_user_agent: ua,
    });

    if (error) {
      console.error("[q.$id] resolve_and_log_scan error:", error.message);
      return new Response(null, {
        status: 302,
        headers: { Location: "/unassigned?id=" + encodeURIComponent(id) },
      });
    }

    // data is null when the card is inactive or has no destination URL
    const destination: string | null = data;

    if (!destination) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/unassigned?id=" + encodeURIComponent(id) },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: destination },
    });
  });

export const Route = createFileRoute("/api/public/q/$id")({
  preload: false,
  loader: ({ params }) => resolveCard({ data: params.id }),
});
