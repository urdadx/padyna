import { WidgetPreview } from "@/components/widget/widget-preview";
import { env } from "@padyna/env/web";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertCircleIcon } from "lucide-react";
import { useChatGeneration } from "@/components/widget/use-chat-gen";

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
	const platform: "web" | "widget" = hostOrigin ? "widget" : "web";

	const { chatId, resetChatId } = useChatGeneration(`chatId_${platform}`);

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
			<div className="grid h-dvh w-full place-items-center bg-white p-6">
				<div className="rounded-md bg-red-50 p-4">
					<div className="flex gap-2">
						<AlertCircleIcon
							className="h-5 w-5 shrink-0 text-red-800"
							aria-hidden="true"
						/>
						<h3 className="text-sm font-sans font-normal text-red-800">
							Missing widgetId. Please make sure you are using the
							correct URL.
						</h3>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="h-dvh w-full overflow-hidden bg-white">
			<WidgetPreview
				widgetId={widgetId}
				serverUrl={env.VITE_SERVER_URL}
				hostOrigin={hostOrigin}
				platform={platform}
				chatId={chatId}
				resetChatId={resetChatId}
			/>
		</div>
	);
}
