import { WidgetMessage } from "./widget-components/message";
import { WidgetStatusIndicator } from "./widget-components/status-indicator";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { WidgetMarkdownCodeBlock } from "./widget-components/code-block";
import { Fragment } from "react";
import { FeedbackBar } from "../agent/feedback-bar";

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

type WidgetMessagesProps = {
  messages: UIMessageLike[];
  isStreaming?: boolean;
  primaryColor?: string;
  chatId?: string;
  chatbotId?: string;
  showVoteBlock?: boolean;
};

export const WidgetMessages = ({
  messages,
  isStreaming,
  primaryColor,
  chatId,
  chatbotId,
  showVoteBlock,
}: WidgetMessagesProps) => {
  return messages.map((message, index) => {
    const isLastMessage = index === messages.length - 1;
    const isCurrentlyStreaming = isStreaming && isLastMessage;
    const isUser = message.role === "user";

    const parts = message.parts ?? [];

    const textParts = parts.filter(
      (part): part is MessagePart => part.type === "text" && "text" in part && Boolean(part.text),
    );

    const hasTextContent = textParts.length > 0;
    const hasContentText = Boolean(message.contentText);

    const hasVisibleContent = hasTextContent || hasContentText || parts.length === 0;

    const getStatusLabel = () => {
      if (!isCurrentlyStreaming || hasTextContent) return null;

      const isSearchingDocs = parts.some(
        (p: any) => p.type === "tool-knowledge_base" && p.state !== "output-available",
      );
      const isEscalating = parts.some(
        (p: any) => p.type === "tool-escalate_to_human" && p.state !== "output-available",
      );

      if (isSearchingDocs) return "Searching...";
      if (isEscalating) return "Escalating to a human...";
      return "Thinking...";
    };

    const statusLabel = getStatusLabel();
    const showFeedbackBlock =
      !isCurrentlyStreaming && isLastMessage && message.role === "assistant" && showVoteBlock;

    const messageContent = statusLabel ? (
      <WidgetStatusIndicator label={statusLabel} />
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
                className="cursor-help font-medium text-neutral-900 underline decoration-dotted underline-offset-2 hover:text-neutral-600"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="list-outside list-disc pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="list-outside list-decimal pl-6">{children}</ol>,
            code: WidgetMarkdownCodeBlock,
          }}
          className="text-foreground text-content-emphasis overflow-wrap-anywhere wrap-break-word min-w-0 w-full overflow-hidden"
        >
          {part.text}
        </Streamdown>
      ))
    );

    return (
      <Fragment key={message.id}>
        <WidgetMessage
          isUser={isUser}
          animate={isUser || isCurrentlyStreaming}
          primaryColor={primaryColor}
        >
          {!hasVisibleContent && !statusLabel ? null : messageContent}
        </WidgetMessage>
        {showFeedbackBlock ? (
          <FeedbackBar
            key={`vote-${message.id}`}
            messageId={message.id}
            chatId={chatId}
            chatbotId={chatbotId!}
          />
        ) : null}
      </Fragment>
    );
  });
};
