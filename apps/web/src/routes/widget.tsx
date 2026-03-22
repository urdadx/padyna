import { WidgetPreview } from "@/components/widget/widget-preview";
import { env } from "@padyna/env/web";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/widget")({
	component: WidgetRoute,
	validateSearch: (search) => ({
		widgetId: String(search.widgetId ?? ""),
		hostOrigin:
			typeof search.hostOrigin === "string" && search.hostOrigin.length > 0
				? search.hostOrigin
				: undefined,
	}),
});

function WidgetRoute() {
	const { widgetId, hostOrigin } = Route.useSearch();

	useEffect(() => {
		const previousBodyOverflow = document.body.style.overflow;
		const previousHtmlOverflow = document.documentElement.style.overflow;
		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousBodyOverflow;
			document.documentElement.style.overflow = previousHtmlOverflow;
		};
	}, []);

	if (!widgetId) {
		return (
			<div className="grid h-svh w-full place-items-center bg-white p-6">
				<p className="text-sm text-neutral-600">Missing widgetId.</p>
			</div>
		);
	}

	return (
		<div className="h-svh w-full overflow-hidden bg-white">
			<WidgetPreview
				widgetId={widgetId}
				serverUrl={env.VITE_SERVER_URL}
				hostOrigin={hostOrigin}
			/>
		</div>
	);
}
