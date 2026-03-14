import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "../ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "../ai-elements/message";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlaneBold } from "@/assets/icons/plane-icon";
import { AgentHeader } from "./agent-header";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

export function AgentPreviewPanel() {
	const { data: session } = useSession();
	const chatbotId = session?.session.activeChatbot;

	const { data: chatbot, isLoading } = useQuery({
		...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
		enabled: !!chatbotId,
	});

	const initialMessage = chatbot?.initialMessage || "Hi! What can I help you with?";
	const hidePoweredBy = chatbot?.hidePoweredBy || false;
	const primaryColor = chatbot?.primaryColor || "#6366f1";
	const suggestedMessages = chatbot?.suggestedMessages || [];

	return (
		<div className="relative grid h-full w-full place-items-center px-4 py-6 md:px-8">
			<div className="mx-auto flex h-full w-full max-w-102 items-center justify-center">
				<div
					className="flex h-full max-h-183 w-full flex-col rounded-xl border bg-background"
					style={{
						"--primary": primaryColor,
					} as React.CSSProperties}>
					<AgentHeader chatbot={chatbot} isLoading={isLoading} />
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						<Conversation className="px-2 py-4">
							<ConversationContent className="gap-4 px-0 py-0">
								<Message from={"assistant"}>
									<MessageContent
										className="rounded-lg bg-muted px-4 py-3 leading-6 text-foreground max-w-[85%]">
										<MessageResponse className="**:text-inherit">
											{initialMessage}
										</MessageResponse>
									</MessageContent>
								</Message>
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>

						{suggestedMessages.length > 0 && (
							<div className="flex flex-wrap gap-2 px-4 pb-2">
								{suggestedMessages.map((msg, idx) => (
									<Button
										key={idx}
										variant="outline"
										size="sm"
										className="text-xs text-muted-foreground">
										{msg}
									</Button>
								))}
							</div>
						)}

						<div className="border-t rounded-b-xl px-4 py-4 bg-gray-50">
							<div className="flex items-end gap-2">
								<Input
									className="bg-white"
									placeholder="Type your message here..."
								/>
								<Button type="button" aria-label="Send message">
									<PlaneBold color="white" className="size-4" />
								</Button>
							</div>
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
