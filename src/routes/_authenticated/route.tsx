import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/lib/supabase";

/**
 * Authenticated layout guard.
 *
 * If there is no active session, redirect to /auth before rendering any child
 * route (e.g. /admin).  Because this uses a `beforeLoad` hook it runs on the
 * server for SSR requests as well.
 */
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
