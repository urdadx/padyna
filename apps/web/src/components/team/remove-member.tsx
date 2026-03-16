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

interface RemoveMemberProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	member: any;
}

export const RemoveMember = ({ isOpen, onOpenChange, member }: RemoveMemberProps) => {
	const handleRemove = () => {
		onOpenChange(false);
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
						{member?.user.name || member?.user.email} from the organization?
						This action cannot be undone and they will lose all access.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleRemove}
						className="bg-red-600 hover:bg-red-700 text-white">
						Remove member
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
