import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(admin)/actions")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
