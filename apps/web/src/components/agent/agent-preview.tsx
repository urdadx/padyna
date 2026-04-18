import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "../ai-elements/conversation";

import { SupportMessage } from "./agent-components/message";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlaneBold } from "@/assets/icons/plane-icon";
import { AgentHeader } from "./agent-header";
import { useSession } from "@/lib/auth-client";
import { useChat, Provider } from "@padyna/store";
import { env } from "@padyna/env/web";
import { queryClient, trpc } from "@/utils/trpc";
import { generateUUID } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { PreviewMessages } from "./preview-messages";
import "streamdown/styles.css";
import { ErrorBanner, ClosedBanner, DisabledBanner, EscalatedBanner } from "../chat-logs/banners";

function AgentPreviewPanelContent() {
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${env.VITE_SERVER_URL}/api/chat`,
				credentials: "include",
			}),
		[],
	);

	const [input, setInput] = useState("");
	const [chatId, setChatId] = useState(() => generateUUID());
	const { data: session } = useSession();
	const chatbotId = session?.session.activeChatbot;

	const {
		data: chatbot,
		isLoading,
		isSuccess,
	} = useQuery({
		...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
		enabled: !!chatbotId,
	});

	const { data: conversations } = useQuery({
		...trpc.conversations.getAll.queryOptions({ filter: "all", sort: "recent" }),
		enabled: !!chatbotId,
	});

	const initialMessage = chatbot?.initialMessage || "Hi! What can I help you with?";
	const hidePoweredBy = chatbot?.hidePoweredBy || false;
	const primaryColor = chatbot?.primaryColor || "#6366f1";
	const suggestedMessages = chatbot?.suggestedMessages || [];
	const isEnabled = chatbot?.isEnabled ?? false;

	const { messages, setMessages, sendMessage, status } = useChat({ id: chatId, transport });

	const isStreaming = status === "streaming";
	const isSubmitted = status === "submitted";
	const isError = status === "error";
	const isReady = status === "ready";

	const showVoteBlock =
		messages.length > 0 && messages[messages.length - 1].role === "assistant" && isReady;
	const activeConversation = conversations?.find((conversation) => conversation.id === chatId);
	const activeConversationId = activeConversation?.id;

	const isEscalated = activeConversation?.status === "escalated";
	const isClosed = activeConversation?.status === "closed";

	const resetConversation = () => {
		setChatId(generateUUID());
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
		queryClient.invalidateQueries({
			queryKey: trpc.conversations.getAll.queryOptions({
				filter: "all",
				sort: "recent",
			}).queryKey,
		});
	};

	const borderStyle = {
		"--ring": primaryColor,
	} as React.CSSProperties;

	return (
		<div className="relative grid h-full min-h-0 min-w-0 w-full place-items-center overflow-x-hidden px-4 py-6 md:px-8">
			<div className="mx-auto flex h-full min-h-0 min-w-0 w-full max-w-102 items-center justify-center overflow-x-hidden">
				<div
					className="flex h-full min-h-0 min-w-0 max-h-183 w-full flex-col overflow-x-hidden rounded-xl border bg-background"
					style={
						{
							"--primary": primaryColor,
						} as React.CSSProperties
					}>
					<AgentHeader
						chatbot={chatbot}
						isLoading={isLoading}
						onReset={resetConversation}
					/>
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden smooth-div">
						<Conversation className="min-h-0 py-4">
							<ConversationContent className="gap-4 p-4">
								{messages.length === 0 ? (
									<>
										<SupportMessage animate={false}>
											{initialMessage}
										</SupportMessage>
									</>
								) : (
									<PreviewMessages
										messages={messages}
										chatId={activeConversationId}
										chatbotId={chatbotId || undefined}
										isReady={isReady}
										isStreaming={isStreaming}
										isSubmitted={isSubmitted}
										primaryColor={primaryColor}
										showVoteBlock={showVoteBlock}
									/>
								)}
								{isError && !isStreaming && <ErrorBanner />}
								{isClosed && (
									<ClosedBanner
										startNewConversation={resetConversation}
									/>
								)}
								{isSuccess && !isEnabled && <DisabledBanner />}
								{isEscalated && <EscalatedBanner />}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>
						<div className="p-4 space-y-3 rounded-b-xl border-t bg-gray-50/40 ">
							{suggestedMessages.length > 0 && (
								<div className="">
									<Suggestions>
										{suggestedMessages.map((msg, idx) => (
											<Suggestion
												key={`${msg}-${idx}`}
												suggestion={msg}
												disabled={isStreaming}
												onClick={(suggestion) => {
													void submitMessage(
														suggestion,
													);
												}}
											/>
										))}
									</Suggestions>
								</div>
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
									onChange={(event) =>
										setInput(event.target.value)
									}
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
			</div>
		</div>
	);
}

export function AgentPreviewPanel() {
	return (
		<Provider>
			<AgentPreviewPanelContent />
		</Provider>
	);
}
