import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/q/$id")({
  preload: false,
  loader: ({ params }) => {
    throw redirect({
      to: "/q/$id",
      params: { id: params.id },
    });
  },
});
