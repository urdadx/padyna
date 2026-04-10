import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChatConversationPanel } from "./chat-conversation-panel";

interface DrawerConversationsProps {
	chatId?: string;
	onClose: () => void;
}

export const DrawerConversations = ({ chatId, onClose }: DrawerConversationsProps) => {
	const isOpen = Boolean(chatId);

	return (
		<Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DrawerContent className="h-[95dvh]">
				<DrawerHeader className="sr-only">
					<DrawerTitle>Chat Conversation</DrawerTitle>
				</DrawerHeader>
				<div className="flex-1 overflow-hidden">
					<ChatConversationPanel
						chatId={chatId}
						className="border-none rounded-none"
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
};
