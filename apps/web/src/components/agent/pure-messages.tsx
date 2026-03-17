import { SupportMessage } from "./agent-components/message";
import { StatusIndicator } from "./agent-components/status-indicator";
import { SourceCitations, extractSources } from "./source-citations";
import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { MarkdownCodeBlock } from "./agent-components/code-block";

const streamdownPlugins = { cjk, code, math, mermaid };

type PureMessagesProps = {
	messages: UIMessage[];
	isReady?: boolean;
	isStreaming?: boolean;
	primaryColor?: string;
};

export const PureMessages = ({
	messages,
	isReady,
	isStreaming,
	primaryColor,
}: PureMessagesProps) => {
	return messages.map((message, index) => {
		const isLastMessage = index === messages.length - 1;
		const isCurrentlyStreaming = isStreaming && isLastMessage;
		const isUser = message.role === "user";

		const sources = extractSources(
			message.parts as { type: string; [key: string]: unknown }[],
		);

		const textParts = message.parts.filter(
			(part): part is { type: "text"; text: string } =>
				part.type === "text" && "text" in part && Boolean(part.text),
		);

		const hasTextContent = textParts.length > 0;

		const hasVisibleContent = hasTextContent || message.parts.length === 0;

		const getStatusLabel = () => {
			if (!isCurrentlyStreaming || hasTextContent) return null;

			const isSearchingDocs = message.parts.some(
				(p: any) =>
					p.type === "tool-knowledge_base" && p.state !== "output-available",
			);

			if (isSearchingDocs) return "Searching...";

			return "Thinking...";
		};

		const statusLabel = getStatusLabel();

		const messageContent = statusLabel ? (
			<StatusIndicator label={statusLabel} />
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
					className="text-foreground text-content-emphasis">
					{part.text}
				</Streamdown>
			))
		);

		return (
			<>
				<SupportMessage
					key={message.id}
					isUser={isUser}
					animate={isUser || isCurrentlyStreaming}
					primaryColor={primaryColor}>
					{!hasVisibleContent && !statusLabel ? null : messageContent}
				</SupportMessage>
				{message.role === "assistant" &&
					sources.length > 0 &&
					!isCurrentlyStreaming &&
					isReady && <SourceCitations sources={sources} />}
			</>
		);
	});
};
