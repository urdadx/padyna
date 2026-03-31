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
import { authClient, useSession } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RemoveMemberProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	member: any;
}

export const RemoveMember = ({ isOpen, onOpenChange, member }: RemoveMemberProps) => {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const organizationId = session?.session?.activeOrganization || undefined;

	const { mutate: removeMember, isPending } = useMutation({
		mutationFn: async () => {
			await authClient.organization.removeMember({
				memberIdOrEmail: member.id,
				organizationId: organizationId,
			});
		},
		onSuccess: () => {
			toast.success("Member removed");
			queryClient.invalidateQueries({
				queryKey: ["team-members", organizationId],
			});
			onOpenChange(false);
		},
		onError: (error) => {
			console.error(error);
			toast.warning(error.message || "Failed to remove member. Please try again");
		},
	});

	const handleRemove = (e: React.MouseEvent) => {
		e.preventDefault();
		removeMember();
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="text-xl font-semibold">
						Remove team member
					</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to remove{" "}
						<span className="font-semibold text-foreground">
							{member?.user.name || member?.user.email}
						</span>{" "}
						from the organization? This action cannot be undone and they
						will lose all access.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleRemove}
						disabled={isPending}
						className="bg-red-600 hover:bg-red-700 text-white min-w-30">
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Removing...
							</>
						) : (
							"Yes, remove"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
