import {
  createAgentUIStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  isTextUIPart,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import type { createSupportChatAgent } from "./agents";
import {
  KNOWLEDGE_BASE_TOOL_NAME,
  searchKnowledgeBase,
  type KnowledgeBaseOutput,
} from "./knowledge-base-tool";

type SupportAgent = Awaited<ReturnType<typeof createSupportChatAgent>>;

export interface PrefetchedKnowledge {
  query: string;
  output: KnowledgeBaseOutput;
}

const MAX_PREFETCH_QUERY_CHARS = 1_000;

export function getLatestUserText(messages: Array<Pick<UIMessage, "role" | "parts">>) {
  const latest = messages.findLast((message) => message.role === "user");
  const text = latest?.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(" ")
    .trim();
  return text ? text.slice(0, MAX_PREFETCH_QUERY_CHARS) : null;
}

/**
 * Searches the knowledge base for the visitor's message while the rest of the
 * request is set up. Failures return null and the agent searches on its own.
 */
export async function prefetchKnowledge(input: {
  query: string | null;
  chatbotId: string;
  organizationId: string;
}): Promise<PrefetchedKnowledge | null> {
  if (!input.query) {
    return null;
  }

  try {
    const output = await searchKnowledgeBase({
      query: input.query,
      chatbotId: input.chatbotId,
      organizationId: input.organizationId,
    });
    return { query: input.query, output };
  } catch (error) {
    console.error("Knowledge prefetch failed; the agent will search itself", error);
    return null;
  }
}

function addUsage(total: LanguageModelUsage, step: LanguageModelUsage): LanguageModelUsage {
  const sum = (a?: number, b?: number) => (a ?? 0) + (b ?? 0);
  return {
    ...total,
    inputTokens: sum(total.inputTokens, step.inputTokens),
    outputTokens: sum(total.outputTokens, step.outputTokens),
    totalTokens: sum(total.totalTokens, step.totalTokens),
  };
}

/**
 * Streams the agent's reply, starting from an already-completed knowledge_base call
 * when one was prefetched. The model gets the results as if it had called the tool,
 * so it can answer in its first step instead of spending a whole extra model call on
 * deciding to search. The same tool part is streamed to the client, so source
 * citations and stored history look exactly like a normal tool call.
 */
export function streamAgentResponse(input: {
  agent: SupportAgent;
  uiMessages: UIMessage[];
  prefetched: PrefetchedKnowledge | null;
  onFinish: (messages: UIMessage[]) => Promise<void> | void;
  onUsage?: (usage: LanguageModelUsage) => Promise<void> | void;
}) {
  const { agent, uiMessages, prefetched } = input;
  let usage: LanguageModelUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  } as LanguageModelUsage;

  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer }) => {
      let agentMessages = uiMessages;

      if (prefetched) {
        const toolCallId = `prefetch_${generateId()}`;
        const toolInput = { query: prefetched.query };

        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        writer.write({
          type: "tool-input-available",
          toolCallId,
          toolName: KNOWLEDGE_BASE_TOOL_NAME,
          input: toolInput,
        });
        writer.write({ type: "tool-output-available", toolCallId, output: prefetched.output });
        writer.write({ type: "finish-step" });

        agentMessages = [
          ...uiMessages,
          {
            id: generateId(),
            role: "assistant",
            parts: [
              { type: "step-start" },
              {
                type: `tool-${KNOWLEDGE_BASE_TOOL_NAME}`,
                toolCallId,
                state: "output-available",
                input: toolInput,
                output: prefetched.output,
              },
            ],
          } as UIMessage,
        ];
      }

      const agentStream = await createAgentUIStream({
        agent,
        uiMessages: agentMessages,
        // The prefetched tool call already opened the assistant message.
        sendStart: !prefetched,
        onStepFinish: (step) => {
          usage = addUsage(usage, step.usage);
        },
      });

      writer.merge(agentStream);
    },
    onFinish: async ({ messages }) => {
      await Promise.all([input.onFinish(messages), input.onUsage?.(usage)]);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
