import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface AssignDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onAssign: (userId?: string) => void;
	onUnassign?: () => void;
	isPending: boolean;
	isAdmin: boolean;
	currentUserId?: string;
	assignedToUserId?: string | null;
}

export const AssignDialog = ({
	isOpen,
	onOpenChange,
	onAssign,
	onUnassign,
	isPending,
	isAdmin,
	currentUserId,
	assignedToUserId,
}: AssignDialogProps) => {
	const isAssigned = Boolean(assignedToUserId);
	const isAssignedToCurrentUser = Boolean(currentUserId && assignedToUserId === currentUserId);

	const canSelfAssign = isAdmin || !isAssigned || isAssignedToCurrentUser;
	const selfAssignDisabled = isPending || !canSelfAssign;
	const disableMemberAssignButtons = isPending || !isAdmin;

	const { data: members, isLoading: isLoadingMembers } = useQuery({
		...trpc.organization.getMembers.queryOptions(),
		enabled: isOpen,
	});

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-full max-w-xl!">
				<DialogHeader>
					<DialogTitle className="font-semibold text-xl">
						Escalate Conversation
					</DialogTitle>
					<DialogDescription>
						Assign this conversation to a team member to handle
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 ">
					{isAdmin && isAssigned && onUnassign && (
						<Button
							size="sm"
							variant="outline"
							onClick={onUnassign}
							disabled={isPending}>
							Remove assignment
						</Button>
					)}

					<div className="max-h-50 overflow-y-auto space-y-2 pr-2">
						{isLoadingMembers ? (
							<div className="text-center py-4 text-sm text-muted-foreground">
								Loading members...
							</div>
						) : members?.length === 0 ? (
							<div className="text-center py-4 text-sm text-muted-foreground">
								No members found
							</div>
						) : (
							members?.map((member) => {
								const isCurrentUser = Boolean(
									currentUserId && member.id === currentUserId,
								);

								return (
									<div
										key={member.id}
										className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors">
										<div className="flex items-center gap-3">
											<Avatar className="h-10 w-10 rounded-full border">
												<AvatarImage
													className="rounded-lg"
													src={
														member.image ??
														undefined
													}
												/>
												<AvatarFallback className="bg-gray-50 text-sm text-gray-500 rounded-full">
													{member.name
														?.slice(0, 2)
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col">
												<span className="text-sm font-medium">
													{member.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{member.email}
												</span>
											</div>
										</div>
										<Tooltip>
											<TooltipTrigger>
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														onAssign(
															member.id,
														)
													}
													disabled={
														isCurrentUser
															? selfAssignDisabled
															: disableMemberAssignButtons
													}>
													Assign
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												{isCurrentUser
													? canSelfAssign
														? "Assign to yourself"
														: "You cannot assign this conversation to yourself"
													: "Only admins can assign conversations to other members"}
											</TooltipContent>
										</Tooltip>
									</div>
								);
							})
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
