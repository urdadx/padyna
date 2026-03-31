import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { queryClient, trpc } from "./utils/trpc";
import { GlobalLoader } from "./components/global-loader";

async function prepare() {
	return queryClient.fetchQuery(trpc.auth.getSession.queryOptions());
}

prepare().then((session) => {
	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		defaultPendingComponent: GlobalLoader,
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
