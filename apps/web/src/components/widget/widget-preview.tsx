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
	setStoredSession,
	clearStoredSession,
	setWidgetActive,
	setWidgetInactive,
} from "@/lib/analytics/track";
import { getOrCreateVisitorId } from "@/lib/analytics/visitor";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/utils/trpc";
import { DefaultChatTransport } from "ai";
import { WidgetHeader } from "./widget-header";
import { WidgetMessages } from "./widget-messages";
import { WidgetMessage } from "./widget-components/message";
import "streamdown/styles.css";
import Spinner from "../ui/spinner";
import api from "@/lib/api";
import { useLiveChatSocket } from "@/lib/chat/live-chat-socket";
import { ChatStatusHeader } from "../chat-logs/chat-status-header";
import { TypingIndicator } from "../chat-logs/typing-indicator";
import { DisabledBanner, EscalatedBanner, ErrorBanner, ClosedBanner } from "../chat-logs/banners";

const ESCALATED_STATUSES = new Set(["escalated", "assigned"]);

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
	conversationStatus: string | null;
	liveChatToken: string | null;
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
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const previousChatStatusRef = useRef<"ready" | "submitted" | "streaming" | "error">("ready");

	const {
		data: initData,
		isLoading,
		refetch: refetchInitData,
	} = useQuery({
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
	const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
				setWidgetInactive(sessionIdRef.current, chatbotId),
				trackEvent({
					chatbotId,
					sessionId: sessionIdRef.current,
					visitorId: visitorIdRef.current,
					event: "widget_close",
				}),
				endSession({
					sessionId: sessionIdRef.current,
					chatbotId,
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

		const handleVisibilityChange = async () => {
			if (document.visibilityState === "hidden") {
				visibilityTimeoutRef.current = setTimeout(async () => {
					await endCurrentSession();
				}, 1000);
			} else {
				if (visibilityTimeoutRef.current) {
					clearTimeout(visibilityTimeoutRef.current);
					visibilityTimeoutRef.current = null;
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			if (visibilityTimeoutRef.current) {
				clearTimeout(visibilityTimeoutRef.current);
			}
		};
	}, [chatbotId, widgetConfig?.isEnabled, endCurrentSession]);

	useEffect(() => {
		if (!chatbotId || !widgetConfig?.isEnabled) return;

		const handleMessage = async (event: MessageEvent) => {
			const type = (event.data as { type?: string })?.type;

			if (type === "padyna:widget_open") {
				isSessionEndedRef.current = false;

				if (!visitorIdRef.current) {
					visitorIdRef.current = getOrCreateVisitorId();
				}

				if (!sessionIdRef.current) {
					try {
						const session = await createSession({
							chatbotId,
							visitorId: visitorIdRef.current,
						});
						sessionIdRef.current = session.id;
						sessionStartTimeRef.current = Date.now();
						setStoredSession(chatbotId, session.id);
						await setWidgetActive(session.id, chatbotId);
					} catch (error) {
						console.error(
							"Failed to create session on widget_open:",
							error,
						);
						return;
					}
				} else {
					try {
						await setWidgetActive(sessionIdRef.current, chatbotId);
					} catch (error) {
						console.error("Failed to set widget active:", error);
					}
				}
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
				return;
			}

			if (type === "padyna:widget_close" || type === "parent-page-unload") {
				await endCurrentSession();
			}
		};

		window.addEventListener("message", handleMessage);

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [chatbotId, widgetConfig?.isEnabled, endCurrentSession]);

	const isStreaming = status === "streaming";
	const isError = status === "error";

	const isEscalated = ESCALATED_STATUSES.has(initData?.conversationStatus ?? "");
	const isClosed = initData?.conversationStatus === "closed";

	const liveChat = useLiveChatSocket({
		conversationId: chatId,
		role: "visitor",
		enabled: Boolean(chatId && isEscalated && initData?.liveChatToken),
		autoJoin: true,
		joinToken: initData?.liveChatToken ?? undefined,
		userName: "Visitor",
		onMessage: (incoming) => {
			setMessages((prev: any[]) => {
				if (prev.some((message) => message.id === incoming.id)) {
					return prev;
				}

				return [
					...prev,
					{
						id: incoming.id,
						role: incoming.role,
						parts: [{ type: "text", text: incoming.text }],
						contentText: incoming.text,
					},
				];
			});
		},
		onConversationStatus: (payload) => {
			if (!chatId || payload.conversationId !== chatId) {
				return;
			}

			if (payload.status === "closed" || payload.status === "opened") {
				setInput("");
			}

			queryClient.invalidateQueries({
				queryKey: ["widget-init", widgetId, chatId],
			});
			void refetchInitData();
		},
	});

	useEffect(() => {
		if (!chatId || isEscalated || !liveChat.isConnected) {
			return;
		}

		const timer = setTimeout(() => {
			void refetchInitData();
		}, 350);

		return () => {
			clearTimeout(timer);
		};
	}, [chatId, isEscalated, liveChat.isConnected, refetchInitData]);

	useEffect(() => {
		const previous = previousChatStatusRef.current;
		previousChatStatusRef.current = status;

		if (!chatId || isEscalated) {
			return;
		}

		if (previous === "streaming" && status === "ready") {
			void refetchInitData();
		}
	}, [chatId, isEscalated, status, refetchInitData]);

	useEffect(() => {
		if (!isEscalated || !liveChat.hasJoined) {
			return;
		}

		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = null;
		}

		if (input.trim().length === 0) {
			liveChat.sendTyping(false);
			return;
		}

		liveChat.sendTyping(true);
		typingTimeoutRef.current = setTimeout(() => {
			liveChat.sendTyping(false);
			typingTimeoutRef.current = null;
		}, 1_200);
	}, [input, isEscalated, liveChat]);

	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, []);

	const showVoteBlock =
		messages.length > 0 &&
		messages[messages.length - 1].role === "assistant" &&
		!!chatId &&
		!!widgetConfig?.id &&
		!(isEscalated && liveChat.isPeerJoined);

	const resetConversation = () => {
		chatStartedRef.current = false;
		resetChatId?.();
		setInput("");
		setMessages([]);
	};

	const submitMessage = async (text: string) => {
		const next = text.trim();
		if (!next || (isStreaming && !isEscalated)) {
			return;
		}

		if (isEscalated) {
			if (!liveChat.canSendMessages) {
				return;
			}

			const sent = liveChat.sendMessage(next);
			if (!sent) {
				return;
			}

			setInput("");
			liveChat.sendTyping(false);
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

	const cantSendMessage = isClosed || (isEscalated ? !liveChat.canSendMessages : isStreaming);
	const canSendMessage = !cantSendMessage;
	const inputPlaceholder = isClosed
		? "This conversation has ended."
		: isEscalated
			? !initData?.liveChatToken
				? "Connecting live support..."
				: liveChat.canSendMessages
					? "Type your message..."
					: "Waiting for human agent to join..."
			: "Ask me anything...";

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
			{isEscalated ? (
				<ChatStatusHeader
					variant="visitor"
					status={liveChat.status}
					hasJoined={liveChat.hasJoined}
					isPeerJoined={liveChat.isPeerJoined}
					isConnected={liveChat.isConnected}
					onConnect={liveChat.connect}
					onJoin={liveChat.join}
				/>
			) : null}
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

						{isError && !isStreaming && <ErrorBanner />}
						{!isEnabled && <DisabledBanner />}
						{isClosed && (
							<ClosedBanner startNewConversation={resetConversation} />
						)}
						{isEscalated && !liveChat.isPeerJoined && <EscalatedBanner />}

						{isEscalated && liveChat.remoteTyping && (
							<TypingIndicator label="Human agent is typing..." />
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
									disabled={!canSendMessage}
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
							placeholder={inputPlaceholder}
							value={input}
							onChange={(event) => setInput(event.target.value)}
							disabled={!canSendMessage}
						/>
						<Button
							type="submit"
							aria-label="Send message"
							disabled={!canSendMessage || !input.trim()}>
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
