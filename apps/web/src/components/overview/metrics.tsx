import { DatabaseIcon, Globe, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { MetricCard } from "./metric-card";
import { ChatFeedback } from "@/assets/icons/chat-feedback";

interface MetricsProps {
	sourcesCount: number;
	conversationsCount: number;
	voteCounts: { upvotes: number; downvotes: number };
	meter: { balance: number } | undefined;
	visitorData: unknown[] | undefined;
}

export function Metrics({
	sourcesCount,
	conversationsCount,
	voteCounts,
	meter,
	visitorData,
}: MetricsProps) {
	const balance = meter?.balance ?? 0;
	const totalVisits = visitorData ? visitorData.length : 0;

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			<MetricCard
				icon={DatabaseIcon}
				title="Connected sources"
				value={sourcesCount ?? 0}
				gradientFrom="purple-50"
				gradientVia="purple-25"
				href="/data-sources"
			/>

			<MetricCard
				icon={ChatFeedback}
				title="Total conversations"
				value={conversationsCount ?? 0}
				gradientFrom="slate-50"
				gradientVia="slate-25"
				href="/chat-logs"
			/>

			<MetricCard
				icon={Star}
				title="Credits remaining"
				value={balance}
				gradientFrom="orange-50"
				gradientVia="orange-25"
				href="/settings?tab=billing"
			/>

			<MetricCard
				icon={Globe}
				title="Unique visitors"
				value={totalVisits}
				gradientFrom="blue-50"
				gradientVia="blue-25"
				href="/analytics"
			/>

			<MetricCard
				icon={ThumbsUp}
				title="Upvotes"
				value={voteCounts?.upvotes ?? 0}
				gradientFrom="green-50"
				gradientVia="green-25"
			/>

			<MetricCard
				icon={ThumbsDown}
				title="Downvotes"
				value={voteCounts?.downvotes ?? 0}
				gradientFrom="red-50"
				gradientVia="red-25"
			/>
		</div>
	);
}
