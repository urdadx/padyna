import { WidgetMessage } from "./widget-components/message";
import { WidgetStatusIndicator } from "./widget-components/status-indicator";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { WidgetMarkdownCodeBlock } from "./widget-components/code-block";
import { Fragment, useRef } from "react";
import { FeedbackBar } from "../agent/feedback-bar";
import {
  CalendlyAppointmentForm,
  getCalendlyAppointmentFormPayloads,
} from "../actions/forms/calendly-appointment-form";
import {
  CalAppointmentForm,
  getCalAppointmentFormPayloads,
} from "../actions/forms/cal-appointment-form";
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

type WidgetMessagesProps = {
  messages: UIMessageLike[];
  isSubmitted?: boolean;
  isStreaming?: boolean;
  primaryColor?: string;
  chatId?: string;
  chatbotId?: string;
  showVoteBlock?: boolean;
};

export const WidgetMessages = ({
  messages,
  isSubmitted,
  isStreaming,
  primaryColor,
  chatId,
  chatbotId,
  showVoteBlock,
}: WidgetMessagesProps) => {
  // The visitor's message animates in as they send it, not when a saved chat loads (or
  // when they scroll back up to it). A batch of messages arriving at once is a load.
  const knownIds = useRef(new Set<string>());
  const sentIds = useRef(new Set<string>());
  const added = messages.filter((message) => !knownIds.current.has(message.id));
  for (const message of added) {
    knownIds.current.add(message.id);
    if (added.length <= 2) sentIds.current.add(message.id);
  }

  return messages.map((message, index) => {
    const isLastMessage = index === messages.length - 1;
    const isPendingAssistantMessage =
      message.role === "assistant" && isLastMessage && (isSubmitted || isStreaming);
    const isCurrentlyStreaming = isStreaming && isLastMessage;
    const isUser = message.role === "user";

    const parts = message.parts ?? [];

    const textParts = parts.filter(
      (part): part is MessagePart => part.type === "text" && "text" in part && Boolean(part.text),
    );

    const hasTextContent = textParts.length > 0;
    const hasContentText = Boolean(message.contentText);
    const calendlyAppointmentForms = getCalendlyAppointmentFormPayloads(parts);
    const calAppointmentForms = getCalAppointmentFormPayloads(parts);
    const jiraIssueForms = getJiraIssueFormPayloads(parts);
    const clickUpIssueForms = getClickUpIssueFormPayloads(parts);
    const formCount =
      calendlyAppointmentForms.length +
      calAppointmentForms.length +
      jiraIssueForms.length +
      clickUpIssueForms.length;

    const hasVisibleContent = hasTextContent || hasContentText || parts.length === 0;

    const getStatusLabel = () => {
      if (!isPendingAssistantMessage || hasTextContent || formCount > 0) return null;

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
                code: WidgetMarkdownCodeBlock,
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
          <WidgetMessage
            isUser={isUser}
            animate={(isUser && sentIds.current.has(message.id)) || isPendingAssistantMessage}
            primaryColor={primaryColor}
          >
            {!hasVisibleContent && !statusLabel ? null : messageContent}
          </WidgetMessage>
        ) : null}
        {calendlyAppointmentForms.map((payload, formIndex) => (
          <CalendlyAppointmentForm
            key={`${message.id}-calendly-form-${formIndex}`}
            payload={payload}
          />
        ))}
        {calAppointmentForms.map((payload, formIndex) => (
          <CalAppointmentForm
            key={`${message.id}-cal-form-${formIndex}`}
            payload={payload}
          />
        ))}
        {jiraIssueForms.map((payload, formIndex) => (
          <JiraIssueForm key={`${message.id}-jira-form-${formIndex}`} payload={payload} />
        ))}
        {clickUpIssueForms.map((payload, formIndex) => (
          <ClickUpIssueForm key={`${message.id}-clickup-form-${formIndex}`} payload={payload} />
        ))}
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
