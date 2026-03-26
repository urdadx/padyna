import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { trpc } from "@/utils/trpc";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Padyna",
			},
			{
				name: "description",
				content: "AI customer support for your business",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
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
				<Toaster />
			</ThemeProvider>
			{/* <TanStackRouterDevtools position="bottom-left" /> */}
			{/* <ReactQueryDevtools position="bottom" buttonPosition="bottom-left" /> */}
		</>
	);
}
