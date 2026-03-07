import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "./ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "./ai-elements/message";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { PlaneBold } from "@/assets/icons/plane-icon";
import { AgentHeader } from "./agent-header";

const previewMessages = [
	{
		content: "Hi! What can I help you with?",
		role: "assistant",
	},
	{
		content: "What plans do you offer for teams?",
		role: "user",
	},
	{
		content: "We offer starter, growth, and enterprise plans. I can help compare features if you'd like.",
		role: "assistant",
	},
] as const;

export function AgentPreviewPanel() {
	return (
		<aside
			className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[28px_28px]"
			aria-label="Preview panel">
			<div className="" />
			<div className="relative grid h-full w-full place-items-center px-4 py-6 md:px-8">
				<div className="mx-auto flex h-full w-full max-w-102 items-center justify-center">
					<div className="flex h-full max-h-183 w-full flex-col rounded-xl border bg-background ">
						<AgentHeader />
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							<Conversation className="px-5 py-5">
								<ConversationContent className="gap-4 px-0 py-0">
									{previewMessages.map((message, index) => (
										<Message
											from={message.role}
											key={`${message.role}-${index}`}>
											<MessageContent
												className={
													message.role ===
													"assistant"
														? "rounded-xl bg-muted px-4 py-3 leading-6 text-foreground"
														: "max-w-[85%] rounded-xl bg-primary px-4 py-3 leading-6 text-primary-foreground"
												}>
												<MessageResponse className="**:text-inherit">
													{message.content}
												</MessageResponse>
											</MessageContent>
										</Message>
									))}
								</ConversationContent>
								<ConversationScrollButton />
							</Conversation>

							<div className="border-t rounded-b-xl px-4 py-4 bg-gray-50">
								<div className="flex items-end gap-2">
									<Input
										className="bg-white"
										placeholder="Type your message here..."
									/>
									<Button
										type="button"
										aria-label="Send message">
										<PlaneBold
											color="white"
											className="size-4"
										/>
									</Button>
								</div>
								<p className="mt-3 text-center text-xs text-muted-foreground">
									Powered by Padyna
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
