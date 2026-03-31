import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invitation/")({
  component: InvitationLayout,
});

function InvitationLayout() {
  return <Outlet />;
}
