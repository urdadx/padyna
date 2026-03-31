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
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import Spinner from "../ui/spinner";
import { polarClient } from "@/lib/polar-client";

interface CancelSubscriptionProps {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanceled?: () => void;
}

export const CancelSubscription = ({
  id,
  open,
  onOpenChange,
  onCanceled,
}: CancelSubscriptionProps) => {
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return polarClient.subscriptions.update({
        id,
        subscriptionUpdate: {
          cancelAtPeriodEnd: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Subscription canceled");
      onOpenChange(false);
      queryClient.invalidateQueries({
        queryKey: trpc.subscription.getOrganizationSubscriptions.queryOptions().queryKey,
      });
      onCanceled?.();
    },
    onError: (error) => {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            Cancel subscription?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your subscription will remain active until the end of the current billing period, then
            it will not renew. You can resubscribe at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              cancelMutation.mutate();
            }}
            disabled={cancelMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {cancelMutation.isPending ? (
              <>
                <Spinner className="text-white" />
                Canceling...
              </>
            ) : (
              "Yes, continue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
