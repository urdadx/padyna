import { SupportMessage } from "./agent-components/message";
import { StatusIndicator } from "./agent-components/status-indicator";
import { extractSources, SourceCitations } from "./source-citations";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { MarkdownCodeBlock } from "./agent-components/code-block";
import { VoteBlock } from "./vote-block";
import { Fragment } from "react";

const streamdownPlugins = { cjk, code, math, mermaid };

type MessagePart = {
	type: string;
	text?: string;
	state?: string;
	output?: unknown;
	[key: string]: unknown;
};

type BaseMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	parts: MessagePart[] | null;
};

type UIMessageLike = BaseMessage & {
	contentText?: string;
};

type BottomComponent = "source-citations" | "vote-block";

type PreviewMessagesProps = {
	messages: UIMessageLike[];
	chatId?: string;
	chatbotId?: string;
	isReady?: boolean;
	isStreaming?: boolean;
	primaryColor?: string;
	bottomComponent?: BottomComponent;
	showVoteBlock?: boolean;
};

export const PreviewMessages = ({
	messages,
	chatId,
	chatbotId,
	isReady,
	isStreaming,
	primaryColor,
	bottomComponent = "vote-block",
	showVoteBlock = false,
}: PreviewMessagesProps) => {
	return messages.map((message, index) => {
		const isLastMessage = index === messages.length - 1;
		const isCurrentlyStreaming = isStreaming && isLastMessage;
		const isUser = message.role === "user";

		const parts = message.parts ?? [];
		const sources = extractSources(parts as { type: string; [key: string]: unknown }[]);

		const textParts = parts.filter(
			(part): part is MessagePart =>
				part.type === "text" && "text" in part && Boolean(part.text),
		);

		const hasTextContent = textParts.length > 0;
		const hasContentText = Boolean(message.contentText);

		const hasVisibleContent = hasTextContent || hasContentText || parts.length === 0;

		const getStatusLabel = () => {
			if (!isCurrentlyStreaming || hasTextContent) return null;

			const isSearchingDocs = parts.some(
				(p: any) =>
					p.type === "tool-knowledge_base" && p.state !== "output-available",
			);

			if (isSearchingDocs) return "Searching...";

			return "Thinking...";
		};

		const statusLabel = getStatusLabel();

		const messageContent = statusLabel ? (
			<StatusIndicator label={statusLabel} />
		) : hasContentText && textParts.length === 0 ? (
			<p className="whitespace-pre-wrap">{message.contentText}</p>
		) : (
			textParts.map((part, partIndex) => (
				<Streamdown
					key={`${message.id}-${partIndex}`}
					isAnimating={isCurrentlyStreaming}
					plugins={streamdownPlugins}
					controls={false}
					components={{
						h1: () => null,
						h2: () => null,
						h3: () => null,
						h4: () => null,
						h5: () => null,
						h6: () => null,
						a: ({ children, href }) => (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className="cursor-help font-medium text-neutral-900 underline decoration-dotted underline-offset-2 hover:text-neutral-600">
								{children}
							</a>
						),
						ul: ({ children }) => (
							<ul className="list-outside list-disc pl-6">
								{children}
							</ul>
						),
						ol: ({ children }) => (
							<ol className="list-outside list-decimal pl-6">
								{children}
							</ol>
						),
						code: MarkdownCodeBlock,
					}}
					className="text-foreground text-content-emphasis overflow-wrap-anywhere wrap-break-word min-w-0 w-full overflow-hidden">
					{part.text}
				</Streamdown>
			))
		);

		return (
			<Fragment key={message.id}>
				<SupportMessage
					isUser={isUser}
					animate={isUser || isCurrentlyStreaming}
					primaryColor={primaryColor}>
					{!hasVisibleContent && !statusLabel ? null : messageContent}
				</SupportMessage>
				{message.role === "assistant" &&
					!isCurrentlyStreaming &&
					isReady &&
					(bottomComponent === "source-citations" ? (
						<SourceCitations sources={sources} />
					) : isLastMessage && showVoteBlock && chatbotId ? (
						<VoteBlock
							messageId={message.id}
							chatId={chatId}
							chatbotId={chatbotId}
						/>
					) : null)}
			</Fragment>
		);
	});
};
