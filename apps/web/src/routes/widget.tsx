import { WidgetPreview } from "@/components/widget/widget-preview";
import { env } from "@padyna/env/web";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { useChatGeneration } from "@/components/widget/use-chat-gen";

export const Route = createFileRoute("/widget")({
	component: WidgetRoute,
	validateSearch: (search) => ({
		widgetId: String(search.widgetId ?? ""),
	}),
});

function isEmbedded() {
	try {
		return window.self !== window.top;
	} catch {
		return true;
	}
}

// The origin of the page embedding this iframe. Read from the browser rather than the URL,
// because whoever frames /widget controls its query string. The server checks this against
// the widget's allowed domains.
function getParentOrigin(): string | undefined {
	const ancestor = window.location.ancestorOrigins?.[0];
	if (ancestor && ancestor !== "null") {
		return ancestor;
	}

	try {
		return document.referrer ? new URL(document.referrer).origin : undefined;
	} catch {
		return undefined;
	}
}

function WidgetRoute() {
	const { widgetId } = Route.useSearch();
	const [{ hostOrigin, platform }] = useState(() => {
		const embedded = isEmbedded();
		return {
			hostOrigin: embedded ? getParentOrigin() : undefined,
			platform: (embedded ? "widget" : "web") as "web" | "widget",
		};
	});

	const { chatId, resetChatId } = useChatGeneration(`chatId_${platform}`);

	useEffect(() => {
		document.body.classList.add("overflow-hidden");
		document.documentElement.classList.add("overflow-hidden");

		return () => {
			document.body.classList.remove("overflow-hidden");
			document.documentElement.classList.remove("overflow-hidden");
		};
	}, []);

	if (!widgetId) {
		return (
			<div className="grid h-svh w-full place-items-center bg-white p-6">
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
		<div className="h-svh w-full overflow-hidden bg-white">
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
