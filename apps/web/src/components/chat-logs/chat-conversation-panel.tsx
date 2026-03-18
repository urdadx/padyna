import { PureMessages } from "@/components/agent/pure-messages";
import { cn } from "@/lib/utils";
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from "./chat-container";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { ChatHeader } from "./chat-header";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface ChatConversationPanelProps {
	chatId?: string;
	className?: string;
}

export const ChatConversationPanel = ({ chatId, className }: ChatConversationPanelProps) => {
	const { data: messages, isLoading } = useQuery({
		...trpc.conversations.getMessages.queryOptions({ conversationId: chatId! }),
		enabled: !!chatId,
		refetchOnMount: true,
	});

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
		<div className={cn("flex min-w-0 flex-col h-full", className)}>
			<ChatContainerRoot optimize className="flex-1 min-w-0 w-full smooth-div relative">
				<ChatContainerContent className="">
					<ChatHeader />
					<div className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden">
						{isLoading ? (
							<div className="p-4 text-center text-muted-foreground">
								Loading messages...
							</div>
						) : messages && messages.length > 0 ? (
							<PureMessages
								messages={messages as any}
								isReady={true}
								isStreaming={false}
							/>
						) : (
							<div className="p-4 text-center text-muted-foreground">
								No messages in this conversation
							</div>
						)}
					</div>
					<ChatContainerScrollAnchor />
				</ChatContainerContent>
			</ChatContainerRoot>
		</div>
	);
};
