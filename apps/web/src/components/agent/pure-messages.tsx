import { Message, MessageContent, MessageResponse } from "../ai-elements/message";
import { Sources, SourcesTrigger, SourcesContent, Source } from "../ai-elements/sources";
import type { UIMessage } from "ai";

type KnowledgeBaseToolOutput = {
	resultCount: number;
	results: Array<{
		chunkId: string;
		datasourceId: string;
		sourceName: string;
		sourceType: "link" | "file" | "qa" | "text";
	}>;
};

function isKnowledgeBaseOutput(value: unknown): value is KnowledgeBaseToolOutput {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as { resultCount?: unknown; results?: unknown };
	return typeof candidate.resultCount === "number" && Array.isArray(candidate.results);
}

function getKnowledgeBaseResultsFromPart(part: unknown): KnowledgeBaseToolOutput["results"] {
	if (!part || typeof part !== "object") {
		return [];
	}

	const candidate = part as {
		type?: unknown;
		state?: unknown;
		output?: unknown;
	};

	if (candidate.type !== "tool-knowledge_base" || candidate.state !== "output-available") {
		return [];
	}

	if (!isKnowledgeBaseOutput(candidate.output)) {
		return [];
	}

	return candidate.output.results;
}
type PureMessagesProps = {
	messages: UIMessage[];
	isReady?: boolean;
};

export const PureMessages = ({ messages, isReady }: PureMessagesProps) => {
	return messages.map((message) => (
		<Message from={message.role} key={message.id}>
			{(() => {
				const sourceRows = message.parts.flatMap(getKnowledgeBaseResultsFromPart);

				const uniqueSources = sourceRows.filter(
					(row, index, list) =>
						index ===
						list.findIndex(
							(item) => item.datasourceId === row.datasourceId,
						),
				);

				return (
					<>
						<MessageContent
							className={
								message.role === "assistant"
									? "max-w-[85%] rounded-lg bg-primary px-4 py-3 leading-6 text-white!"
									: "max-w-[85%] rounded-lg bg-muted px-4 py-3 leading-6 text-foreground"
							}>
							{message.parts.map((part, index) => {
								if (part.type === "text") {
									return (
										<MessageResponse
											className="**:text-inherit"
											key={`${message.id}-${index}`}>
											{part.text}
										</MessageResponse>
									);
								}

								return null;
							})}
						</MessageContent>
						{message.role === "assistant" &&
							uniqueSources.length > 0 &&
							isReady && (
								<Sources className="ml-4 mt-1">
									<SourcesTrigger
										count={uniqueSources.length}
									/>
									<SourcesContent>
										{uniqueSources.map((source) => (
											<Source
												key={source.datasourceId}
												href={`${source.sourceType === "link" ? source.sourceName : "#"}`}
												title={source.sourceName}
											/>
										))}
									</SourcesContent>
								</Sources>
							)}
					</>
				);
			})()}
		</Message>
	));
};
