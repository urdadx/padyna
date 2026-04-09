import { SupportMessage } from "./agent-components/message";
import { StatusIndicator } from "./agent-components/status-indicator";
import { extractSources, SourceCitations } from "./source-citations";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { MarkdownCodeBlock } from "./agent-components/code-block";
import { Fragment, memo } from "react";
import { FeedbackBar } from "./feedback-bar";
import {
  CalendlyAppointmentForm,
  getCalendlyAppointmentFormPayloads,
} from "../actions/forms/calendly-appointment-form";
import { getJiraIssueFormPayloads, JiraIssueForm } from "../actions/forms/jira-issue-form";
import { ClickUpIssueForm, getClickUpIssueFormPayloads } from "../actions/forms/clickup-issue-form";

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

export const PreviewMessages = memo(
  ({
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
        (part): part is MessagePart => part.type === "text" && "text" in part && Boolean(part.text),
      );

      const hasTextContent = textParts.length > 0;
      const hasContentText = Boolean(message.contentText);
      const calendlyAppointmentForms = getCalendlyAppointmentFormPayloads(parts);
      const jiraIssueForms = getJiraIssueFormPayloads(parts);
      const clickUpIssueForms = getClickUpIssueFormPayloads(parts);
      const formCount =
        calendlyAppointmentForms.length + jiraIssueForms.length + clickUpIssueForms.length;

      const hasVisibleContent = hasTextContent || hasContentText || parts.length === 0;

      const getStatusLabel = () => {
        if (!isCurrentlyStreaming || hasTextContent || formCount > 0) return null;

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

      const messageContent = statusLabel ? (
        <StatusIndicator label={statusLabel} />
      ) : (
        <div className="space-y-3">
          {hasContentText && textParts.length === 0 ? (
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
                  ol: ({ children }) => (
                    <ol className="list-outside list-decimal pl-6">{children}</ol>
                  ),
                  code: MarkdownCodeBlock,
                }}
                className="text-foreground text-content-emphasis overflow-wrap-anywhere wrap-break-word min-w-0 w-full overflow-hidden"
              >
                {part.text}
              </Streamdown>
            ))
          )}
        </div>
      );

      return (
        <Fragment key={message.id}>
          {!formCount || hasVisibleContent || statusLabel ? (
            <SupportMessage
              isUser={isUser}
              animate={isUser || isCurrentlyStreaming}
              primaryColor={primaryColor}
            >
              {!hasVisibleContent && !statusLabel ? null : messageContent}
            </SupportMessage>
          ) : null}
          {calendlyAppointmentForms.map((payload, formIndex) => (
            <CalendlyAppointmentForm
              key={`${message.id}-calendly-form-${formIndex}`}
              payload={payload}
            />
          ))}
          {jiraIssueForms.map((payload, formIndex) => (
            <JiraIssueForm key={`${message.id}-jira-form-${formIndex}`} payload={payload} />
          ))}
          {clickUpIssueForms.map((payload, formIndex) => (
            <ClickUpIssueForm key={`${message.id}-clickup-form-${formIndex}`} payload={payload} />
          ))}
          {message.role === "assistant" &&
            !isCurrentlyStreaming &&
            isReady &&
            (bottomComponent === "source-citations" ? (
              <SourceCitations sources={sources} />
            ) : isLastMessage && showVoteBlock && chatbotId ? (
              <FeedbackBar messageId={message.id} chatId={chatId} chatbotId={chatbotId} />
            ) : null)}
        </Fragment>
      );
    });
  },
);
