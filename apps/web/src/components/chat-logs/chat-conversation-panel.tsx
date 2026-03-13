import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from "./chat-container";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { ChatHeader } from "./chat-header";

const MOCK_MESSAGES: Record<string, any[]> = {
	"1": [
		{
			id: "m1",
			role: "user",
			content: "Hi, how do I use the platform?",
		},
		{
			id: "m2",
			role: "assistant",
			content: "Welcome! You can start by exploring the dashboard. Would you like a guided tour or have a specific question?",
		},
	],
	"2": [
		{
			id: "m3",
			role: "user",
			content: "What are the pricing options?",
		},
		{
			id: "m4",
			role: "assistant",
			content: "We have three tiers: Free, Pro ($19/mo), and Enterprise. You can find more details in the billing section.",
		},
	],
};

interface ChatConversationPanelProps {
	chatId?: string;
	className?: string;
}

export const ChatConversationPanel = ({ chatId, className }: ChatConversationPanelProps) => {
	const messages = chatId ? MOCK_MESSAGES[chatId] || [] : [];

	if (!chatId) {
		return (
			<div
				className={cn(
					"flex h-full w-full  flex-1 items-center justify-center p-8 text-center",
					className,
				)}>
				<div className="relative inline-block">
					<div
						className="bg-gray-50 max-w-2xl mx-auto flex items-center mb-2 size-20 shrink-0 justify-center rounded-full border"
						aria-hidden="true">
						<ChatLinear className="h-10 w-10 text-muted-foreground" />
					</div>
					<span className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground border-2 border-background">
						0
					</span>
				</div>
				<div className="space-y-2">
					<h3 className="text-xl text-center font-medium">
						No conversation selected
					</h3>
					<p className="text-sm text-center text-muted-foreground">
						Select a conversation from the list to view the message history.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col h-full", className)}>
			<ChatContainerRoot optimize className="flex-1 w-full smooth-div relative">
				<ChatContainerContent className="">
					<ChatHeader />
					<div className="flex flex-col gap-4">
						{messages.map((message) => (
							<Message key={message.id} from={message.role}>
								<MessageContent>
									<MessageResponse
										className={cn(
											message.role === "user"
												? ""
												: "bg-primary p-3 rounded-lg border-primary text-white",
										)}>
										{message.content}
									</MessageResponse>
								</MessageContent>
							</Message>
						))}
					</div>
					<ChatContainerScrollAnchor />
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
};
