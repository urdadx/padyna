import { DislikeIcon } from "@/assets/icons/dislike-icon";
import { LikeIcon } from "@/assets/icons/like-icon";
import { Button } from "../ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { trpc } from "@/utils/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VoteBlockProps {
	messageId: string;
	chatId?: string;
	chatbotId: string;
}

export const VoteBlock = ({ messageId, chatId, chatbotId }: VoteBlockProps) => {
	const [voted, setVoted] = useState<"up" | "down" | null>(null);
	const queryClient = useQueryClient();

	const castVote = useMutation({
		...trpc.vote.cast.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(trpc.metrics.getOverview.queryFilter());
			},
			onError: (error) => {
				console.error("Failed to cast vote:", error.message);
			},
		}),
	});

	const handleVote = (isUpvoted: boolean) => {
		if (voted || castVote.isPending || !chatId) return;

		setVoted(isUpvoted ? "up" : "down");
		castVote.mutate({
			chatId,
			messageId,
			chatbotId,
			isUpvoted,
		});
	};

	if (!chatId) return null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}>
			<div className="border rounded-lg w-full max-w-md">
				<div className="p-4 flex flex-col items-center">
					<p className="text-sm text-muted-foreground">
						Was this response helpful?
					</p>
					<div className="mt-2 flex gap-4">
						<Button
							onClick={() => handleVote(true)}
							disabled={voted !== null || castVote.isPending}
							className={cn(
								"text-muted-foreground font-normal",
								voted === "up" &&
									"cursor-not-allowed text-green-800 bg-green-50",
							)}
							size="sm"
							variant="outline">
							<LikeIcon color="currentColor" className="size-4" />
							Yes
						</Button>
						<Button
							onClick={() => handleVote(false)}
							disabled={voted !== null || castVote.isPending}
							className={cn(
								"text-muted-foreground font-normal",
								voted === "down" &&
									"cursor-not-allowed text-red-800 bg-red-50",
							)}
							variant="outline"
							size="sm">
							<DislikeIcon color="currentColor" className="size-4" />
							No
						</Button>
					</div>
					{voted && (
						<span className="mt-2 text-sm text-muted-foreground">
							Thanks for your feedback!
						</span>
					)}
				</div>
			</div>
		</motion.div>
	);
};
