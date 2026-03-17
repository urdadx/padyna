import { BookIcon } from "lucide-react";
import { useState } from "react";

export type SourceCitation = {
	url: string;
	heading: string;
};

export function SourceCitations({ sources }: { sources: SourceCitation[] }) {
	const [open, setOpen] = useState(false);

	if (!sources.length) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800">
				<BookIcon className="size-3.5 shrink-0" />
				<span>
					Used {sources.length} source{sources.length > 1 ? "s" : ""}
				</span>
				<svg
					width="10"
					height="10"
					viewBox="0 0 10 10"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.75}
					strokeLinecap="round"
					strokeLinejoin="round"
					className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
					<path d="M2 3.5L5 6.5L8 3.5" />
				</svg>
			</button>

			{open && (
				<ul className="mt-1.5 space-y-1 pl-1">
					{sources.map((source) => (
						<li key={source.url}>
							<a
								href={source.url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-xs text-neutral-500 underline decoration-dotted underline-offset-2 hover:text-neutral-700">
								{source.heading}
							</a>
						</li>
					))}
				</ul>
			)}
		</>
	);
}

export function extractSources(
	parts: { type: string; [key: string]: unknown }[],
): SourceCitation[] {
	const seen = new Set<string>();
	const sources: SourceCitation[] = [];

	for (const part of parts) {
		const isKnowledgeBaseTool = part.type === "tool-knowledge_base";

		if (!isKnowledgeBaseTool) continue;
		if ((part as any).state !== "output-available") continue;

		const output = (part as any).output;
		if (!output) continue;

		if (isKnowledgeBaseTool) {
			const results = output.results;
			if (!Array.isArray(results)) continue;

			for (const r of results) {
				const sourceName = r?.sourceName;
				const sourceType = r?.sourceType;

				if (typeof sourceName !== "string") continue;

				if (seen.has(sourceName)) continue;
				seen.add(sourceName);

				sources.push({
					url: sourceType === "link" ? sourceName : "#",
					heading: sourceName,
				});
			}
		}
	}

	return sources;
}
