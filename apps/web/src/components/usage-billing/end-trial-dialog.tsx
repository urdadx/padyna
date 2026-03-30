import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import Spinner from "../ui/spinner";

interface EndTrialProps {
	id: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEnded?: () => void;
}

export const EndTrial = ({ id, open, onOpenChange, onEnded }: EndTrialProps) => {
	const endTrialMutation = useMutation({
		mutationFn: async () => {
			return trpcClient.subscription.endTrial.mutate({ id });
		},
		onSuccess: () => {
			toast.success("Trial ended — your plan is now active");
			onOpenChange(false);
			queryClient.invalidateQueries({
				queryKey: trpc.subscription.getOrganizationSubscriptions.queryOptions()
					.queryKey,
			});
			onEnded?.();
		},
		onError: (error) => {
			console.error("End trial error:", error);
			toast.error("Failed to end trial. Please try again.");
		},
	});

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="p-5">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-lg font-semibold">
						End your trial early?
					</AlertDialogTitle>
					<AlertDialogDescription>
						Your trial will end immediately and your plan will become
						active. Billing will start from today.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={endTrialMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							endTrialMutation.mutate();
						}}
						disabled={endTrialMutation.isPending}
						className="bg-blue-600 hover:bg-blue-700 text-white">
						{endTrialMutation.isPending ? (
							<>
								<Spinner className="text-white" />
								Ending trial...
							</>
						) : (
							"Yes, end trial"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
