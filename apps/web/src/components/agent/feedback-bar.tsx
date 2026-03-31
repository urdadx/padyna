import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Info, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

type FeedbackBarProps = {
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  messageId: string;
  chatId?: string;
  chatbotId: string;
};

export function FeedbackBar({ className, messageId, chatId, chatbotId }: FeedbackBarProps) {
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
    <div
      className={cn("bg-background border-border inline-flex rounded-lg border text-sm", className)}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-1 items-center justify-start gap-4 py-3 pl-4">
          <Info className="size-4 text-muted-foreground" />
          <span className="text-foreground font-medium">Was this response helpful?</span>
        </div>
        <div className="flex items-center justify-center gap-0.5 px-3 py-0">
          <button
            type="button"
            className={cn(
              "text-muted-foreground flex size-8 items-center justify-center rounded-md transition-colors hover:text-green-500",
              voted === "up" && "text-green-500",
            )}
            aria-label="Helpful"
            onClick={() => handleVote(true)}
          >
            <ThumbsUp className="size-4" />
          </button>
          <button
            type="button"
            className={cn(
              "text-muted-foreground flex size-8 items-center justify-center rounded-md transition-colors hover:text-red-500",
              voted === "down" && "text-red-500",
            )}
            aria-label="Not helpful"
            onClick={() => handleVote(false)}
          >
            <ThumbsDown className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
