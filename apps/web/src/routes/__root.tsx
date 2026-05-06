import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { trpc } from "@/utils/trpc";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "../index.css";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@padyna/api/routers/index";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
	session: RouterOutputs["auth"]["getSession"];
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Padyna | AI customer support for your business",
			},
			{
				name: "description",
				content: "AI customer support for your business",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/padyna-official-logo.ico",
			},
		],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				storageKey="vite-ui-theme">
				<div className="grid h-svh grid-rows-[auto_1fr]">
					<TooltipProvider>
						<Outlet />
					</TooltipProvider>
				</div>
				<Toaster duration={1200} />
			</ThemeProvider>
			{/* <TanStackRouterDevtools position="bottom-left" /> */}
			{/* <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" /> */}
		</>
	);
}
