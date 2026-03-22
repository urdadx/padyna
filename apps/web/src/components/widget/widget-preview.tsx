import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "../ai-elements/conversation";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlaneBold } from "@/assets/icons/plane-icon";
import { useEffect, useMemo, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { WidgetHeader } from "./widget-header";
import { WidgetMessages } from "./widget-messages";
import { WidgetMessage } from "./widget-components/message";
import "streamdown/styles.css";

export type WidgetConfig = {
	id: string;
	name: string | null;
	image: string | null;
	primaryColor: string;
	initialMessage: string;
	hidePoweredBy: boolean;
	suggestedMessages: string[];
};

type WidgetPreviewProps = {
	widgetId: string;
	serverUrl: string;
	hostOrigin?: string;
};

export function WidgetPreview({ widgetId, serverUrl, hostOrigin }: WidgetPreviewProps) {
	const [input, setInput] = useState("");
	const [chatId] = useState(() => crypto.randomUUID());

	const hostOriginQuery = useMemo(() => {
		if (!hostOrigin) {
			return "";
		}

		return `?hostOrigin=${encodeURIComponent(hostOrigin)}`;
	}, [hostOrigin]);

	const { data: widgetConfig, isLoading } = useQuery({
		queryKey: ["widget-config", widgetId, serverUrl, hostOrigin],
		queryFn: async () => {
			const response = await fetch(
				`${serverUrl}/api/widget/${widgetId}/config${hostOriginQuery}`,
			);
			if (!response.ok) {
				throw new Error("Failed to load widget configuration");
			}
			return (await response.json()) as WidgetConfig;
		},
		enabled: Boolean(widgetId),
	});

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${serverUrl}/api/widget/${widgetId}/chat${hostOriginQuery}`,
			}),
		[serverUrl, widgetId, hostOriginQuery],
	);

	const { messages, setMessages, sendMessage, status } = useChat({ transport });

	const isStreaming = status === "streaming";
	const isError = status === "error";
	const isReady = status === "ready";

	const resetConversation = () => {
		setInput("");
		setMessages([]);
	};

	const submitMessage = async (text: string) => {
		const next = text.trim();
		if (!next || isStreaming) {
			return;
		}

		setInput("");
		await sendMessage({ text: next });
	};

	const initialMessage = widgetConfig?.initialMessage || "Hi! What can I help you with?";
	const hidePoweredBy = widgetConfig?.hidePoweredBy || false;
	const primaryColor = widgetConfig?.primaryColor || "#6366f1";
	const suggestedMessages = widgetConfig?.suggestedMessages || [];

	const borderStyle = {
		"--ring": primaryColor,
	} as React.CSSProperties;

	useEffect(() => {
		if (!widgetConfig?.primaryColor) {
			return;
		}

		window.parent?.postMessage(
			{
				type: "padyna:widget:config",
				widgetId,
				primaryColor: widgetConfig.primaryColor,
			},
			"*",
		);
	}, [widgetConfig?.primaryColor, widgetId]);

	return (
		<div
			className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
			style={{ "--primary": primaryColor } as React.CSSProperties}>
			<WidgetHeader
				chatbot={widgetConfig}
				isLoading={isLoading}
				onReset={resetConversation}
			/>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<Conversation className="min-h-0 py-4">
					<ConversationContent className="gap-4 p-4">
						{messages.length === 0 ? (
							<WidgetMessage animate={false}>
								{initialMessage}
							</WidgetMessage>
						) : (
							<WidgetMessages
								messages={messages}
								isReady={isReady}
								isStreaming={isStreaming}
								primaryColor={primaryColor}
								chatId={chatId}
								chatbotId={widgetConfig?.id}
							/>
						)}
						{isError && (
							<div className="rounded-md bg-red-50 p-4">
								<div className="flex gap-2">
									<AlertCircleIcon
										className="h-5 w-5 shrink-0 text-red-800"
										aria-hidden="true"
									/>
									<h3 className="text-sm font-sans font-normal text-red-800">
										Something went wrong. Please try again.
									</h3>
								</div>
							</div>
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				<div className="p-4 space-y-3 border-t bg-gray-50/40">
					{suggestedMessages.length > 0 && (
						<Suggestions>
							{suggestedMessages.map((msg, idx) => (
								<Suggestion
									key={`${msg}-${idx}`}
									suggestion={msg}
									disabled={isStreaming}
									onClick={(suggestion) => {
										void submitMessage(suggestion);
									}}
								/>
							))}
						</Suggestions>
					)}

					<form
						className="flex items-end gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							void submitMessage(input);
						}}>
						<Input
							style={borderStyle}
							className="bg-white focus-visible:ring-ring"
							placeholder="Ask me anything..."
							value={input}
							onChange={(event) => setInput(event.target.value)}
						/>
						<Button
							type="submit"
							aria-label="Send message"
							disabled={isStreaming || !input.trim()}>
							<PlaneBold color="white" className="size-4" />
						</Button>
					</form>

					{!hidePoweredBy && (
						<p className="mt-3 text-center text-xs text-muted-foreground">
							Powered by Padyna
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
