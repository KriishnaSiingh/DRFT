import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createServerFn } from "@tanstack/react-start";

import { supabase } from "@/lib/supabase";
import { isValidCardId, deviceTypeFromUserAgent } from "@/lib/qr-config";

/**
 * Public QR scan endpoint — /q/:id
 *
 * QR codes are printed with URL: https://drftreviews.vercel.app/q/001 … /q/020
 *
 * Flow:
 *  1. Validate card ID (001–020).
 *  2. Call resolve_and_log_scan() RPC — logs scan, returns destination URL.
 *  3. Client-side redirect to destination OR /unassigned if inactive/empty.
 */

const resolveCard = createServerFn({ method: "GET" })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }) => {
    const ua = getRequestHeader("user-agent") ?? null;

    if (!isValidCardId(id)) {
      return { destination: null, error: "invalid_id" };
    }

    const deviceType = deviceTypeFromUserAgent(ua);

    const { data, error } = await supabase.rpc("resolve_and_log_scan", {
      p_card_id: id,
      p_device_type: deviceType,
      p_user_agent: ua,
    });

    if (error) {
      console.error("[q.$id] resolve_and_log_scan error:", error.message);
      return { destination: null, error: error.message };
    }

    return { destination: (data as string | null) ?? null, error: null };
  });

export const Route = createFileRoute("/q/$id")({
  preload: false,
  loader: async ({ params }) => {
    return resolveCard({ data: params.id });
  },
  component: RedirectPage,
});

/**
 * RedirectPage handles the client-side redirect after the server resolves
 * the destination. This is necessary because TanStack Start loaders cannot
 * issue raw HTTP 302s — the redirect is done via window.location in the
 * component on mount.
 */
function RedirectPage() {
  const { destination, error } = Route.useLoaderData();
  const { id } = Route.useParams();

  // Fire redirect as early as possible
  if (typeof window !== "undefined") {
    if (destination) {
      window.location.replace(destination);
    } else {
      window.location.replace(`/unassigned?id=${encodeURIComponent(id)}`);
    }
  }

  // Fallback UI while redirect fires (usually invisible)
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background, #1a1a2e)",
        color: "var(--foreground, #f5f0e8)",
        fontFamily: "system-ui, sans-serif",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {destination ? (
        <>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.5, animation: "spin 1s linear infinite" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p style={{ opacity: 0.6, fontSize: "14px" }}>Redirecting…</p>
        </>
      ) : (
        <p style={{ opacity: 0.6, fontSize: "14px" }}>
          {error === "invalid_id"
            ? "Invalid QR card ID."
            : "Card not yet active."}
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
