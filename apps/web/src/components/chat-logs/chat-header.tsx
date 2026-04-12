import { Button } from "../ui/button";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";
import { RoutingLinear } from "@/assets/icons/routing-icon";
import { SiderbarLinear } from "@/assets/icons/sidebar-icon";
import { SolarStarLinear, SolarStarBold } from "@/assets/icons/star-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { trpc, queryClient } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { AssignDialog } from "./assign-dialog";
import { useRouteContext } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatHeaderProps {
	conversationId?: string;
	isHighPriority?: boolean;
	status?: "opened" | "escalated" | "closed" | "assigned";
	assignedToUserId?: string | null;
}

export const ChatHeader = ({
	conversationId,
	isHighPriority = false,
	status = "opened",
	assignedToUserId,
}: ChatHeaderProps) => {
	const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);
	const isClosed = status === "closed";
	const newStatus = isClosed ? "opened" : "closed";
	const isEscalated = status === "escalated" || status === "assigned";
	const isAssignedStatus = status === "assigned";

	const isMobile = useIsMobile();

	const { session } = useRouteContext({ from: "/(admin)" });

	const isAdmin = session?.user?.role === "admin";
	const currentUserId = session?.user?.id;
	const isAssignedToOther = Boolean(
		assignedToUserId && currentUserId && assignedToUserId !== currentUserId,
	);
	const canDeescalateAssignedConversation = Boolean(
		isAdmin || (assignedToUserId && currentUserId && assignedToUserId === currentUserId),
	);
	const canToggleConversationStatus = !isAssignedStatus || canDeescalateAssignedConversation;

	const updatePriorityMutation = useMutation({
		...trpc.conversations.updatePriority.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getById.queryOptions({ id: conversationId! })
					.queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getAll.queryOptions({
					filter: "all",
					sort: "recent",
				}).queryKey,
			});
			toast.success(
				isHighPriority ? "Removed priority from chat" : "Marked as priority",
			);
		},
		onError: () => {
			toast.error("Failed to update priority. Please try again.");
		},
	});

	const toggleStatusMutation = useMutation({
		...trpc.conversations.updateStatus.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getById.queryOptions({ id: conversationId! })
					.queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getAll.queryOptions({
					filter: "all",
					sort: "recent",
				}).queryKey,
			});
			toast.success(isClosed ? "Chat marked as opened" : "Chat marked as closed");
		},
		onError: () => {
			toast.error("Failed to update status. Please try again.");
		},
	});

	const escalateMutation = useMutation({
		...trpc.conversations.updateStatus.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getById.queryOptions({ id: conversationId! })
					.queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.conversations.getAll.queryOptions({
					filter: "all",
					sort: "recent",
				}).queryKey,
			});
			toast.success("Chat status updated");
			setIsEscalateDialogOpen(false);
		},
		onError: () => {
			toast.error("Failed to update status. Please try again.");
		},
	});

	const handleEscalateClick = () => {
		if (isAssignedStatus && !canDeescalateAssignedConversation) {
			return;
		}

		if (isEscalated) {
			escalateMutation.mutate({
				id: conversationId!,
				status: "opened",
			});
		} else {
			setIsEscalateDialogOpen(true);
		}
	};

	const assignToUser = (userId?: string) => {
		if (!conversationId) return;

		if (!isAdmin) {
			if (isAssignedToOther || !currentUserId || (userId && userId !== currentUserId)) {
				return;
			}
		}

		escalateMutation.mutate({
			id: conversationId,
			status: "assigned",
			assignedTo: isAdmin ? userId : currentUserId,
		});
	};

	const unassignConversation = () => {
		if (!conversationId || !isAdmin) return;
		escalateMutation.mutate({
			id: conversationId,
			status: "escalated",
		});
	};

	const priorityTooltipText = !conversationId
		? "Select a chat first"
		: isHighPriority
			? "Remove priority"
			: "Mark as priority";

	const escalateTooltipText = !conversationId
		? "Select a chat first"
		: isClosed
			? "Chat is currently closed, open first to escalate"
			: isAssignedStatus && !canDeescalateAssignedConversation
				? "Only the assigned member or an admin can de-escalate this chat"
				: isEscalated
					? "De-escalate"
					: "Escalate to human agent";

	const closeTooltipText = !conversationId
		? "Select a chat first"
		: !canToggleConversationStatus
			? "Only the assigned member or an admin can close this chat"
			: isClosed
				? "Mark chat as open"
				: "Mark chat as closed";

	return (
		<div className="px-2 sticky rounded-t-2xl top-0 flex justify-center sm:justify-end h-14 shrink-0 items-center bg-background/50 backdrop-blur-lg border-b transition-[width,height] ease-linear z-10 group-has-data/[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex items-center gap-2">
				<Tooltip>
					<TooltipContent>{priorityTooltipText}</TooltipContent>
					<TooltipTrigger>
						<Button
							variant="outline"
							size={isMobile ? "default" : "icon"}
							className="rounded-full"
							onClick={() =>
								conversationId &&
								updatePriorityMutation.mutate({
									id: conversationId,
									isHighPriority: !isHighPriority,
								})
							}
							disabled={
								!conversationId || updatePriorityMutation.isPending
							}>
							{isHighPriority ? (
								<SolarStarBold
									color="#fbbf24"
									className="h-4 w-4"
								/>
							) : (
								<>
									<SolarStarLinear className="h-4 w-4" />
									<span className="flex sm:hidden text-muted-foreground">
										Star
									</span>
								</>
							)}
						</Button>
					</TooltipTrigger>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						<Button
							variant="outline"
							className="text-gray-500 hover:text-black rounded-full"
							onClick={handleEscalateClick}
							disabled={
								!conversationId ||
								escalateMutation.isPending ||
								isClosed ||
								(isAssignedStatus &&
									!canDeescalateAssignedConversation)
							}>
							<RoutingLinear
								className={
									isEscalated ? "h-4 w-4 text-white" : "h-4 w-4"
								}
							/>
							{isEscalated ? "De-escalate" : "Escalate"}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{escalateTooltipText}</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						<Button
							variant={isClosed ? "outline" : "default"}
							className="rounded-3xl"
							onClick={() =>
								conversationId &&
								toggleStatusMutation.mutate({
									id: conversationId,
									status: newStatus,
								})
							}
							disabled={
								!conversationId ||
								toggleStatusMutation.isPending ||
								!canToggleConversationStatus
							}>
							<>
								<CheckMarkIcon
									color={isClosed ? "green" : "white"}
									className="h-4 w-4"
								/>
								{isClosed ? "Reopen" : "Close"}
							</>
						</Button>
					</TooltipTrigger>
					<TooltipContent>{closeTooltipText}</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						<Button
							variant="outline"
							size={isMobile ? "default" : "icon"}
							className="rounded-full">
							<SiderbarLinear className="h-4 w-4" />
							<span className="flex sm:hidden text-muted-foreground">
								View details
							</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>View chat details</TooltipContent>
				</Tooltip>
			</div>

			<AssignDialog
				isOpen={isEscalateDialogOpen}
				onOpenChange={setIsEscalateDialogOpen}
				onAssign={assignToUser}
				onUnassign={unassignConversation}
				isPending={escalateMutation.isPending}
				isAdmin={!!isAdmin}
				currentUserId={currentUserId}
				assignedToUserId={assignedToUserId}
			/>
		</div>
	);
};
