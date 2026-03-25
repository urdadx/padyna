import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "../ai-elements/conversation";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlaneBold } from "@/assets/icons/plane-icon";
import { Provider, useChat } from "@padyna/store";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
	createSession,
	endSession,
	trackEvent,
	getStoredSessionId,
	setStoredSession,
	clearStoredSession,
	updateSessionActivity,
} from "@/lib/analytics/track";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor";
import { AlertCircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { WidgetHeader } from "./widget-header";
import { WidgetMessages } from "./widget-messages";
import { WidgetMessage } from "./widget-components/message";
import "streamdown/styles.css";
import Spinner from "../ui/spinner";
import api from "@/lib/api";

export type WidgetConfig = {
	id: string;
	name: string | null;
	image: string | null;
	primaryColor: string;
	initialMessage: string;
	hidePoweredBy: boolean;
	suggestedMessages: string[];
	isEnabled: boolean;
};

type WidgetPreviewProps = {
	widgetId: string;
	serverUrl: string;
	hostOrigin?: string;
	chatId?: string;
	resetChatId?: () => void;
};

type InitResponse = {
	config: WidgetConfig;
	messages: any[];
};

function WidgetPreviewContent({ widgetId, hostOrigin, chatId, resetChatId }: WidgetPreviewProps) {
	const hostOriginQuery = useMemo(() => {
		if (!hostOrigin) {
			return "";
		}

		return `?hostOrigin=${encodeURIComponent(hostOrigin)}`;
	}, [hostOrigin]);

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${import.meta.env.VITE_SERVER_URL}/api/widget/${widgetId}/chat${hostOriginQuery}`,
			}),
		[widgetId, hostOriginQuery],
	);

	const [input, setInput] = useState("");

	const { data: initData, isLoading } = useQuery({
		queryKey: ["widget-init", widgetId, chatId, hostOrigin],
		queryFn: async () => {
			const response = await api.post(
				`/api/widget/${widgetId}/init`,
				{ conversationId: chatId },
				{ params: hostOrigin ? { hostOrigin } : undefined },
			);
			return response.data as InitResponse;
		},
		enabled: Boolean(widgetId),
	});

	const widgetConfig = initData?.config;
	const chatbotId = widgetConfig?.id;

	const sessionIdRef = useRef<string | null>(null);
	const visitorIdRef = useRef<string>("");
	const chatStartedRef = useRef<boolean>(false);
	const sessionStartTimeRef = useRef<number>(0);
	const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isSessionEndedRef = useRef<boolean>(false);

	const [lastInitializedId, setLastInitializedId] = useState<string | undefined>(undefined);

	const { messages, setMessages, sendMessage, status } = useChat({ id: chatId, transport });

	useEffect(() => {
		if (initData?.messages && chatId !== lastInitializedId) {
			setMessages(initData.messages);
			setLastInitializedId(chatId);
		}
	}, [initData, chatId, lastInitializedId, setMessages]);

	const endCurrentSession = useCallback(async () => {
		if (!sessionIdRef.current || !chatbotId || isSessionEndedRef.current) {
			return;
		}

		isSessionEndedRef.current = true;

		if (inactivityTimeoutRef.current) {
			clearTimeout(inactivityTimeoutRef.current);
			inactivityTimeoutRef.current = null;
		}

		const durationMs = Date.now() - sessionStartTimeRef.current;
		const isBounce = !chatStartedRef.current;

		try {
			await Promise.all([
				trackEvent({
					chatbotId,
					sessionId: sessionIdRef.current,
					visitorId: visitorIdRef.current,
					event: "widget_close",
				}),
				endSession({
					sessionId: sessionIdRef.current,
					durationMs,
					isBounce,
				}),
			]);
		} catch (error) {
			console.error("Failed to end session:", error);
		}

		clearStoredSession(chatbotId);
		sessionIdRef.current = null;
	}, [chatbotId]);

	useEffect(() => {
		if (chatId && chatId !== lastInitializedId) {
			chatStartedRef.current = false;
		}
	}, [chatId, lastInitializedId]);

	useEffect(() => {
		if (!chatbotId || !widgetConfig?.isEnabled) return;

		const initTracking = async () => {
			visitorIdRef.current = getOrCreateVisitorId();

			const existingSessionId = getStoredSessionId(chatbotId);

			if (existingSessionId) {
				sessionIdRef.current = existingSessionId;
				sessionStartTimeRef.current = Date.now();
				updateSessionActivity(chatbotId);
			} else {
				try {
					const session = await createSession({
						chatbotId,
						visitorId: visitorIdRef.current,
					});
					sessionIdRef.current = session.id;
					sessionStartTimeRef.current = Date.now();
					setStoredSession(chatbotId, session.id);
				} catch (error) {
					console.error("Failed to create session:", error);
				}
			}

			if (sessionIdRef.current) {
				try {
					await trackEvent({
						chatbotId,
						sessionId: sessionIdRef.current,
						visitorId: visitorIdRef.current,
						event: "widget_open",
					});
				} catch (error) {
					console.error("Failed to track widget_open:", error);
				}
			}
		};

		initTracking();

		return () => {
			void endCurrentSession();
		};
	}, [chatbotId, widgetConfig?.isEnabled, endCurrentSession]);

	const isStreaming = status === "streaming";
	const isError = status === "error";

	const showVoteBlock =
		messages.length > 0 &&
		messages[messages.length - 1].role === "assistant" &&
		!!chatId &&
		!!widgetConfig?.id;

	const resetConversation = () => {
		chatStartedRef.current = false;
		resetChatId?.();
		setInput("");
		setMessages([]);
	};

	const submitMessage = async (text: string) => {
		const next = text.trim();
		if (!next || isStreaming) {
			return;
		}
		setInput("");

		if (!chatStartedRef.current && sessionIdRef.current && chatbotId) {
			chatStartedRef.current = true;
			try {
				await trackEvent({
					chatbotId,
					sessionId: sessionIdRef.current,
					visitorId: visitorIdRef.current,
					event: "chat_started",
					conversationId: chatId,
				});
			} catch (error) {
				console.error("Failed to track chat_started:", error);
			}
		}

		if (sessionIdRef.current && chatbotId) {
			try {
				await trackEvent({
					chatbotId,
					sessionId: sessionIdRef.current,
					visitorId: visitorIdRef.current,
					event: "chat_message",
					conversationId: chatId,
				});
			} catch (error) {
				console.error("Failed to track chat_message:", error);
			}
		}
		await sendMessage({ text: next });
	};

	const initialMessage = widgetConfig?.initialMessage;
	const hidePoweredBy = widgetConfig?.hidePoweredBy;
	const primaryColor = widgetConfig?.primaryColor;
	const suggestedMessages = widgetConfig?.suggestedMessages || [];
	const isEnabled = widgetConfig?.isEnabled ?? false;

	const borderStyle = {
		"--ring": primaryColor,
	} as React.CSSProperties;

	if (isLoading) {
		return (
			<div className="flex-1 flex min-h-full items-center justify-center">
				<Spinner size={30} />
			</div>
		);
	}

	return (
		<div
			className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
			style={{ "--primary": primaryColor } as React.CSSProperties}>
			<WidgetHeader
				chatbot={widgetConfig}
				isLoading={isLoading}
				onReset={resetConversation}
			/>
			<div className="flex min-h-0 flex-1 flex-col smooth-div">
				<Conversation className="min-h-0 py-4">
					<ConversationContent className="gap-4 p-4">
						{isEnabled && messages.length === 0 ? (
							<WidgetMessage animate={false}>
								{initialMessage}
							</WidgetMessage>
						) : (
							<WidgetMessages
								messages={messages}
								isStreaming={isStreaming}
								primaryColor={primaryColor}
								chatId={chatId}
								chatbotId={widgetConfig?.id}
								showVoteBlock={showVoteBlock}
							/>
						)}

						{isError && !isStreaming && (
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
						{!isEnabled && (
							<div className="rounded-md bg-blue-50 p-4">
								<div className="flex gap-2 items-center">
									<AlertCircleIcon
										className="h-5 w-5 shrink-0 text-blue-800"
										aria-hidden="true"
									/>
									<h3 className="text-sm font-sans font-normal text-blue-800">
										This widget is currently disabled.
										Please contact the site administrator
										for help
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
							className="bg-white text-sm focus-visible:ring-ring"
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

export function WidgetPreview(props: WidgetPreviewProps) {
	return (
		<Provider>
			<WidgetPreviewContent {...props} />
		</Provider>
	);
}
