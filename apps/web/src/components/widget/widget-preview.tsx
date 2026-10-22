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
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/utils/trpc";
import { DefaultChatTransport } from "ai";
import * as Sentry from "@sentry/react";
import { WidgetHeader } from "./widget-header";
import { WidgetMessages } from "./widget-messages";
import { WidgetMessage } from "./widget-components/message";
import { WidgetEmojiPicker } from "./widget-emoji-picker";
import { useWelcomeIntro } from "./use-welcome-intro";
import { BouncingDots } from "loading-dev";

import "streamdown/styles.css";

import Spinner from "../ui/spinner";
import api from "@/lib/api";
import { useLiveChatSocket } from "@/lib/chat/live-chat-socket";
import { ChatStatusHeader } from "../chat-logs/chat-status-header";
import { DisabledBanner, EscalatedBanner, ErrorBanner, ClosedBanner } from "../chat-logs/banners";
import { getInputPlaceholder } from "./get-input-placeholder";
import { useAnalytics } from "./use-analytics";
import { useSubmitMessage } from "./use-submit-message";
import { useWidgetSession } from "./use-widget-session";
import { StatusIndicator } from "../agent/agent-components/status-indicator";
import { SupportMessage } from "../agent/agent-components/message";
import { env } from "@padyna/env/web";
import { browserSafeChatFetch } from "@/lib/ai/browser-safe-chat-fetch";

const ESCALATED_STATUSES = new Set(["escalated", "assigned"]);
const DEFAULT_WELCOME_MESSAGE = "Hi👋. How can I help you?";

function getWidgetDebugInfo() {
	if (typeof window === "undefined") {
		return null;
	}

	let localStorageAvailable = false;
	try {
		const key = "padyna-debug-storage-test";
		window.localStorage.setItem(key, "1");
		window.localStorage.removeItem(key);
		localStorageAvailable = true;
	} catch {}

	let isIframe = false;
	try {
		isIframe = window.self !== window.top;
	} catch {
		isIframe = true;
	}

	return {
		url: window.location.href,
		userAgent: window.navigator.userAgent,
		platform: window.navigator.platform,
		vendor: window.navigator.vendor,
		language: window.navigator.language,
		isIframe,
		localStorageAvailable,
		supports: {
			abortController: typeof AbortController !== "undefined",
			fetch: typeof fetch !== "undefined",
			readableStream: typeof ReadableStream !== "undefined",
			structuredClone: typeof structuredClone !== "undefined",
			textDecoderStream: typeof TextDecoderStream !== "undefined",
			transformStream: typeof TransformStream !== "undefined",
			cryptoRandomUUID: typeof globalThis.crypto?.randomUUID === "function",
		},
	};
}

export type WidgetConfig = {
	id: string;
	name: string | null;
	image: string | null;
	primaryColor: string;
	initialMessage: string;
	launcherMessage: string;
	hidePoweredBy: boolean;
	suggestedMessages: string[];
	isEnabled: boolean;
};

type WidgetPreviewProps = {
	widgetId: string;
	serverUrl: string;
	hostOrigin?: string;
	platform?: "web" | "widget";
	chatId?: string;
	resetChatId?: () => void;
};

type InitResponse = {
	config: WidgetConfig;
	messages: any[];
	conversationStatus: string | null;
	liveChatToken: string | null;
};

function WidgetPreviewContent({
	widgetId,
	hostOrigin,
	platform,
	chatId,
	resetChatId,
}: WidgetPreviewProps) {
	const params = new URLSearchParams();
	if (hostOrigin) {
		params.set("hostOrigin", hostOrigin);
	}
	if (platform) {
		params.set("platform", platform);
	}
	const queryParams = params.toString();

	const chatApi = `${env.VITE_SERVER_URL}/api/widget/${widgetId}/chat${queryParams ? `?${queryParams}` : ""}`;

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: chatApi,
				fetch: browserSafeChatFetch,
				// The server loads history from the database; only the new message is sent.
				prepareSendMessagesRequest: ({ id, messages }) => ({
					body: { id, message: messages.at(-1) },
				}),
			}),
		[chatApi],
	);

	const [input, setInput] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	// Bumped each time the SDK opens the widget, so the welcome intro plays on every open.
	const [openCount, setOpenCount] = useState(0);

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.source !== window.parent || window.parent === window) return;
			if ((event.data as { type?: string } | null)?.type === "padyna:widget_open") {
				setOpenCount((count) => count + 1);
			}
		};

		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	// Insert at the caret so picking an emoji mid-sentence doesn't jump to the end.
	const insertEmoji = (emoji: string) => {
		const element = inputRef.current;
		const start = element?.selectionStart ?? input.length;
		const end = element?.selectionEnd ?? input.length;
		setInput(input.slice(0, start) + emoji + input.slice(end));

		requestAnimationFrame(() => {
			element?.focus();
			element?.setSelectionRange(start + emoji.length, start + emoji.length);
		});
	};

	const initQueryKey = ["widget-init", widgetId, chatId, hostOrigin, platform];

	const {
		data: initData,
		isLoading,
		refetch: refetchInitData,
	} = useQuery({
		queryKey: initQueryKey,
		queryFn: async () => {
			const response = await api.post(
				`/api/widget/${widgetId}/init`,
				{ conversationId: chatId },
				{
					params:
						hostOrigin || platform
							? {
									...(hostOrigin ? { hostOrigin } : {}),
									...(platform ? { platform } : {}),
								}
							: undefined,
				},
			);
			return response.data as InitResponse;
		},
		enabled: Boolean(widgetId),
	});

	const widgetConfig = initData?.config;
	const chatbotId = widgetConfig?.id;

	const { messages, setMessages, sendMessage, status } = useChat({
		id: chatId,
		transport,
		onError: (error) => {
			const debugInfo = getWidgetDebugInfo();

			console.error("[Padyna widget] chat request failed", {
				error,
				errorName: error.name,
				errorMessage: error.message,
				errorStack: error.stack,
				widgetId,
				chatId,
				hostOrigin,
				platform,
				chatApi,
				debugInfo,
			});

			Sentry.withScope((scope) => {
				scope.setTag("padyna.area", "widget-chat");
				scope.setContext("widget", {
					widgetId,
					chatId,
					hostOrigin,
					platform,
					chatApi,
				});
				scope.setContext("browserDebug", debugInfo);
				Sentry.captureException(error);
			});
		},
	});

	const messageIdsRef = useRef(new Set<string>());
	const hydratedChatIdRef = useRef<string | undefined>(undefined);

	const { sessionId, visitorId, chatStarted, resetChatStarted } = useWidgetSession({
		chatbotId,
		isEnabled: widgetConfig?.isEnabled,
		chatId,
	});

	const { track } = useAnalytics({
		chatbotId,
		sessionIdRef: sessionId,
		visitorIdRef: visitorId,
	});

	const isStreaming = status === "streaming";
	const isSubmitted = status === "submitted";
	const isError = status === "error";
	const isEscalated = ESCALATED_STATUSES.has(initData?.conversationStatus ?? "");
	const isClosed = initData?.conversationStatus === "closed";
	const welcomePhase = useWelcomeIntro(openCount, messages.length > 0);

	// The live socket normally announces an escalation, but it only opens with
	// the first message; if the AI escalates before it connects, the finished
	// reply's escalate_to_human call still brings the widget into live mode.
	const lastMessage = messages.at(-1);
	const repliedWithEscalation =
		status === "ready" &&
		lastMessage?.role === "assistant" &&
		lastMessage.parts.some((part) => part.type === "tool-escalate_to_human");
	useEffect(() => {
		if (repliedWithEscalation && !isEscalated) {
			void refetchInitData();
		}
	}, [repliedWithEscalation, isEscalated, refetchInitData]);

	useEffect(() => {
		if (!chatId || !initData || hydratedChatIdRef.current === chatId) {
			return;
		}

		const hydratedMessages = (initData.messages ?? []) as any[];
		setMessages(hydratedMessages);
		messageIdsRef.current = new Set(hydratedMessages.map((message) => message.id));
		hydratedChatIdRef.current = chatId;
	}, [chatId, initData, setMessages]);

	const liveChat = useLiveChatSocket({
		conversationId: chatId,
		role: "visitor",
		// No conversation exists to escalate until the first message is sent, so
		// visitors who only open the widget don't hold a socket.
		enabled: Boolean(chatId) && (messages.length > 0 || isEscalated),
		autoJoin: isEscalated,
		joinToken: initData?.liveChatToken ?? undefined,
		userName: "Visitor",
		onMessage: (incoming) => {
			if (messageIdsRef.current.has(incoming.id)) return;
			messageIdsRef.current.add(incoming.id);

			const uiMessage = {
				id: incoming.id,
				role: incoming.role as "user" | "assistant",
				createdAt: incoming.createdAt,
				contentText: incoming.text ?? "",
				parts: [
					{
						type: "text",
						text: incoming.text ?? "",
					},
				],
			};

			setMessages((prev) => [...prev, uiMessage as any]);
		},
		onConversationStatus: (payload) => {
			if (!chatId || payload.conversationId !== chatId) return;

			if (payload.status === "closed" || payload.status === "opened") {
				setInput("");
			}

			queryClient.invalidateQueries({ queryKey: initQueryKey });
			void refetchInitData();
		},
	});

	// Typing is sent as transitions only: "true" once when the visitor starts,
	// "false" after a pause or when the input is cleared.
	const typingSentRef = useRef(false);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const canSendTyping = isEscalated && liveChat.hasJoined && liveChat.canSendMessages;
	const { sendTyping } = liveChat;

	useEffect(() => {
		const stopTyping = () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
				typingTimeoutRef.current = null;
			}
			if (typingSentRef.current) {
				typingSentRef.current = false;
				sendTyping(false);
			}
		};

		if (!canSendTyping || input.trim().length === 0) {
			stopTyping();
			return;
		}

		if (!typingSentRef.current) {
			typingSentRef.current = sendTyping(true);
		}

		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}
		typingTimeoutRef.current = setTimeout(stopTyping, 1_200);
	}, [input, canSendTyping, sendTyping]);

	useEffect(
		() => () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		},
		[],
	);

	const { submit } = useSubmitMessage({
		chatId,
		isEscalated,
		isStreaming,
		liveChat,
		chatStartedRef: chatStarted,
		sendMessage,
		track,
		setInput,
	});

	const resetConversation = () => {
		resetChatStarted();
		hydratedChatIdRef.current = undefined;
		messageIdsRef.current = new Set();
		resetChatId?.();
		setInput("");
		setMessages([]);
	};

	const requestCloseWidget = () => {
		if (platform !== "widget" || window.parent === window) {
			return;
		}

		window.parent.postMessage(
			{ type: "padyna:widget_request_close" },
			hostOrigin || "*",
		);
	};

	const showVoteBlock =
		messages.length > 0 &&
		messages[messages.length - 1].role === "assistant" &&
		!!chatId &&
		!!widgetConfig?.id &&
		!(isEscalated && liveChat.isPeerJoined);

	const cantSendMessage = isClosed || (isEscalated ? !liveChat.canSendMessages : isStreaming);
	const canSendMessage = !cantSendMessage;

	const inputPlaceholder = getInputPlaceholder({
		isClosed,
		isEscalated,
		hasLiveChatToken: !!initData?.liveChatToken,
		canSendMessages: liveChat.canSendMessages,
	});

	const suggestedMessageItems = useMemo(() => {
		const seen = new Map<string, number>();
		return (widgetConfig?.suggestedMessages ?? []).map((message) => {
			const occurrence = (seen.get(message) ?? 0) + 1;
			seen.set(message, occurrence);

			return { key: `${message}-${occurrence}`, message };
		});
	}, [widgetConfig?.suggestedMessages]);

	if (isLoading) {
		return (
			<div className="flex-1 flex min-h-full items-center justify-center">
				<Spinner size={30} />
			</div>
		);
	}

	return (
		<div
			className="flex h-[100dvh] sm:h-full min-h-0 w-full flex-col overflow-hidden bg-background"
			style={{ "--primary": widgetConfig?.primaryColor } as React.CSSProperties}>
			<WidgetHeader
				chatbot={widgetConfig}
				isLoading={isLoading}
				onReset={resetConversation}
				onClose={platform === "widget" ? requestCloseWidget : undefined}
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
						{widgetConfig?.isEnabled && messages.length === 0 ? (
							<WidgetMessage key={welcomePhase} animate>
								{welcomePhase === "typing" ? (
									<span
										className="flex items-center text-muted-foreground"
										aria-label="Assistant is typing">
										<BouncingDots size={20} color="currentColor" />
									</span>
								) : (
									widgetConfig.initialMessage || DEFAULT_WELCOME_MESSAGE
								)}
							</WidgetMessage>
						) : (
							<WidgetMessages
								messages={messages}
								isSubmitted={isSubmitted}
								isStreaming={isStreaming}
								primaryColor={widgetConfig?.primaryColor}
								chatId={chatId}
								chatbotId={widgetConfig?.id}
								showVoteBlock={showVoteBlock}
							/>
						)}

						{isError && !isStreaming && <ErrorBanner />}
						{!widgetConfig?.isEnabled && <DisabledBanner />}
						{isClosed && (
							<ClosedBanner startNewConversation={resetConversation} />
						)}
						{isEscalated && !liveChat.isPeerJoined && <EscalatedBanner />}
						{isEscalated && liveChat.remoteTyping && (
							<SupportMessage isUser={false} animate={false}>
								<StatusIndicator label="Agent is typing..." />
							</SupportMessage>
						)}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				<div className="p-4 space-y-3 border-t bg-gray-50/40">
					{suggestedMessageItems.length > 0 && (
							<Suggestions>
								{suggestedMessageItems.map(({ key, message }) => (
									<Suggestion
										key={key}
										suggestion={message}
										disabled={!canSendMessage}
										onClick={(suggestion) =>
											void submit(suggestion)
										}
									/>
								))}
							</Suggestions>
						)}

					<form
						className="flex items-end gap-2"
						action={() => {
							void submit(input);
						}}>
						<div className="relative min-w-0 flex-1">
							<Input
								ref={inputRef}
								style={
									{
										"--ring": widgetConfig?.primaryColor,
									} as React.CSSProperties
								}
								className="bg-white pr-10 text-sm focus-visible:ring-ring"
								placeholder={inputPlaceholder}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								disabled={!canSendMessage}
							/>
							<div className="absolute inset-y-0 right-1 flex items-center">
								<WidgetEmojiPicker
									disabled={!canSendMessage}
									onEmojiSelect={insertEmoji}
								/>
							</div>
						</div>
						<Button
							type="submit"
							aria-label="Send message"
							disabled={!canSendMessage || !input.trim()}>
							<PlaneBold color="white" className="size-4" />
						</Button>
					</form>

					{!widgetConfig?.hidePoweredBy && (
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
