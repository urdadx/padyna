"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	CodeBlock,
	CodeBlockBody,
	CodeBlockContent,
	CodeBlockItem,
} from "@/components/ai-elements/code-block";
import { cn } from "@/lib/utils";
import { RiCheckboxCircleFill } from "@remixicon/react";
import type { ToolUIPart } from "ai";
import { ChevronDownIcon, CircleIcon, ClockIcon, XCircleIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
	<Collapsible
		className={cn("not-prose mb-4 w-full rounded-md border", className)}
		{...props}
	/>
);

export type ToolHeaderProps = {
	type: ToolUIPart["type"];
	state: ToolUIPart["state"];
	className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
	const labels = {
		"input-streaming": "Pending",
		"input-available": "Running",
		"approval-requested": "Waiting for approval",
		"approval-responded": "Approval received",
		"output-available": "Completed",
		"output-error": "Error",
		"output-denied": "Denied",
	} as const;

	const icons = {
		"input-streaming": <CircleIcon className="size-4" />,
		"input-available": <ClockIcon className="size-4 animate-pulse" />,
		"approval-requested": <ClockIcon className="size-4 animate-pulse" />,
		"approval-responded": <RiCheckboxCircleFill className="size-4 text-green-600" />,
		"output-available": <RiCheckboxCircleFill className="size-4 text-green-600" />,
		"output-error": <XCircleIcon className="size-4 text-red-600" />,
		"output-denied": <XCircleIcon className="size-4 text-red-600" />,
	} as const;

	return (
		<Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
			{icons[status]}
			{labels[status]}
		</Badge>
	);
};

export const ToolHeader = ({ className, type, state, ...props }: ToolHeaderProps) => (
	<CollapsibleTrigger
		className={cn("flex w-full items-center justify-between gap-4 p-3", className)}
		{...props}>
		<div className="flex items-center gap-2">
			<span className="font-medium text-sm truncate w-60">
				{type.includes("escalate_to_human")
					? "Escalated conversation to a human agent"
					: type.includes("calendly_action")
						? "Initiated a Calendly meeting"
						: type.includes("action_jira")
							? "Showed a Jira ticket form to user"
							: type.includes("clickup_action")
								? "Showed a ClickUp issue form to user"
								: type.includes("discord_action")
									? "Sent a Discord message"
									: type.includes("slack_action")
										? "Sent a Slack message"
										: type.includes("cal_action")
											? "Initiated a Cal.com meeting"
											: type}
			</span>
			{getStatusBadge(state)}
		</div>
		<ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
	</CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
	<CollapsibleContent
		className={cn(
			"w-full sm:w-125 data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
			className,
		)}
		{...props}
	/>
);

export type ToolInputProps = ComponentProps<"div"> & {
	input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
	<div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
		<h4 className="font-medium font-sans text-muted-foreground text-xs uppercase tracking-wide">
			Parameters
		</h4>
		<CodeBlock
			defaultValue="json"
			data={[
				{
					language: "json",
					filename: "parameters.json",
					code: JSON.stringify(input, null, 2),
				},
			]}>
			<CodeBlockBody>
				{(item) => (
					<CodeBlockItem key={item.language} value={item.language}>
						<CodeBlockContent language="json">{item.code}</CodeBlockContent>
					</CodeBlockItem>
				)}
			</CodeBlockBody>
		</CodeBlock>
	</div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
	output: ToolUIPart["output"];
	errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
	if (!(output || errorText)) {
		return null;
	}

	let Output = <div>{output as ReactNode}</div>;

	if (typeof output === "object") {
		Output = (
			<CodeBlock
				defaultValue="json"
				data={[
					{
						language: "json",
						filename: "result.json",
						code: JSON.stringify(output, null, 2),
					},
				]}>
				<CodeBlockBody>
					{(item) => (
						<CodeBlockItem key={item.language} value={item.language}>
							<CodeBlockContent language="json">
								{item.code}
							</CodeBlockContent>
						</CodeBlockItem>
					)}
				</CodeBlockBody>
			</CodeBlock>
		);
	} else if (typeof output === "string") {
		Output = (
			<CodeBlock
				defaultValue="text"
				data={[
					{
						language: "text",
						filename: "result.txt",
						code: output,
					},
				]}>
				<CodeBlockBody>
					{(item) => (
						<CodeBlockItem key={item.language} value={item.language}>
							<CodeBlockContent syntaxHighlighting={false}>
								{item.code}
							</CodeBlockContent>
						</CodeBlockItem>
					)}
				</CodeBlockBody>
			</CodeBlock>
		);
	}

	return (
		<div className={cn("space-y-2 p-4", className)} {...props}>
			<h4 className="font-medium text-muted-foreground text-xs font-sans uppercase tracking-wide">
				{errorText ? "Error" : "Result"}
			</h4>
			<div
				className={cn(
					"overflow-x-auto rounded-md text-xs [&_table]:w-full",
					errorText
						? "bg-destructive/10 text-destructive"
						: "bg-muted/50 text-foreground",
				)}>
				{errorText && <div>{errorText}</div>}
				{Output}
			</div>
		</div>
	);
};
