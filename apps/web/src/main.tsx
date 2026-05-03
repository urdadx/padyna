import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import * as Sentry from "@sentry/react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { queryClient, trpc } from "./utils/trpc";
import { GlobalLoader } from "./components/global-loader";
import { NotFoundPage } from "./not-found";
import { ErrorPage } from "./error-page";
import { env } from "@padyna/env/web";

Sentry.init({
	dsn: "https://337ed5f2cc6c298ae0b5c751558aeb43@o4511325808820224.ingest.us.sentry.io/4511325810065408",
	sendDefaultPii: true,
	integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
	tracesSampleRate: 1.0,
	tracePropagationTargets: ["localhost", env.VITE_SERVER_URL],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	enableLogs: true,
});

async function prepare() {
	return queryClient.fetchQuery(trpc.auth.getSession.queryOptions());
}

prepare().then((session) => {
	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		defaultPendingComponent: GlobalLoader,
		defaultNotFoundComponent: NotFoundPage,
		defaultErrorComponent: ({ error }) => <ErrorPage error={error} />,
		scrollRestoration: true,
		context: { trpc, queryClient, session },
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});

	ReactDOM.createRoot(document.getElementById("app")!).render(
		<RouterProvider router={router} />,
	);
});
