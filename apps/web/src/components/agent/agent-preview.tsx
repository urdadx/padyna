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
import { env } from "@padyna/env/web";
import { queryClient, trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { PreviewMessages } from "./preview-messages";
import { AlertCircleIcon } from "lucide-react";
import "streamdown/styles.css";

export function AgentPreviewPanel() {
	const [input, setInput] = useState("");
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
		...trpc.conversations.getAll.queryOptions(),
		enabled: !!chatbotId,
	});

	const initialMessage = chatbot?.initialMessage || "Hi! What can I help you with?";
	const hidePoweredBy = chatbot?.hidePoweredBy || false;
	const primaryColor = chatbot?.primaryColor || "#6366f1";
	const suggestedMessages = chatbot?.suggestedMessages || [];
	const isEnabled = chatbot?.isEnabled ?? false;

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${env.VITE_SERVER_URL}/api/chat`,
				credentials: "include",
			}),
		[],
	);

	const { messages, setMessages, sendMessage, status } = useChat({ transport });

	const isStreaming = status === "streaming";
	const isError = status === "error";
	const isReady = status === "ready";

	const showVoteBlock =
		messages.length > 0 && messages[messages.length - 1].role === "assistant" && isReady;
	const activeConversationId = conversations?.[0]?.id;

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
		queryClient.invalidateQueries({
			queryKey: trpc.conversations.getAll.queryOptions().queryKey,
		});
	};

	const borderStyle = {
		"--ring": primaryColor,
	} as React.CSSProperties;

	return (
		<div className="relative grid h-full min-h-0 w-full place-items-center px-4 py-6 md:px-8">
			<div className="mx-auto flex h-full min-h-0 w-full max-w-102 items-center justify-center">
				<div
					className="flex h-full min-h-0 max-h-183 w-full flex-col rounded-xl border bg-background"
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
									<SupportMessage animate={false}>
										{initialMessage}
									</SupportMessage>
								) : (
									<PreviewMessages
										messages={messages}
										chatId={activeConversationId}
										chatbotId={chatbotId || undefined}
										isReady={isReady}
										isStreaming={isStreaming}
										primaryColor={primaryColor}
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
												Something went wrong. Please
												try again.
											</h3>
										</div>
									</div>
								)}
								{isSuccess && !isEnabled && (
									<div className="rounded-md bg-blue-50 p-4">
										<div className="flex gap-2 items-center">
											<AlertCircleIcon
												className="h-5 w-5 shrink-0 text-blue-800"
												aria-hidden="true"
											/>
											<h3 className="text-sm font-sans font-normal text-blue-800">
												This widget is currently
												disabled. Please contact the
												site administrator for help
											</h3>
										</div>
									</div>
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>
						<div className="p-4 space-y-3 border-t bg-gray-50/40 ">
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

							<div className="">
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
										<PlaneBold
											color="white"
											className="size-4"
										/>
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
		</div>
	);
}
