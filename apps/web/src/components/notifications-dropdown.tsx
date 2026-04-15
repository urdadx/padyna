import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { BellLinear } from "@/assets/icons/notification-icon";
import { queryClient, trpc } from "@/utils/trpc";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";

function formatCreatedAt(createdAt: string | Date) {
	const date = new Date(createdAt);
	if (Number.isNaN(date.getTime())) {
		return "just now";
	}

	return formatDistanceToNow(date, { addSuffix: true });
}

export function NotificationsDropdown() {
	const { data: unreadCount = 0 } = useQuery({
		...trpc.notifications.unreadCount.queryOptions(),
	});

	const { data: notificationsData } = useQuery(
		trpc.notifications.list.queryOptions({
			limit: 100,
		}),
	);

	const notifications = notificationsData?.items ?? [];

	const invalidateNotifications = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.notifications.unreadCount.queryOptions().queryKey,
		});
		await queryClient.invalidateQueries({
			queryKey: trpc.notifications.list.queryOptions({ limit: 12 }).queryKey,
		});
	};

	const markReadMutation = useMutation({
		...trpc.notifications.markRead.mutationOptions(),
		onSuccess: async () => {
			await invalidateNotifications();
		},
	});

	const markAllReadMutation = useMutation({
		...trpc.notifications.markAllRead.mutationOptions(),
		onSuccess: async () => {
			await invalidateNotifications();
		},
	});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button className="relative" variant="outline">
					<BellLinear className="size-4" color="currentColor" />
					{unreadCount > 0 ? (
						<span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-white text-xs font-semibold z-10">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					) : null}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-88 p-0" align="end">
				<div className="flex items-center justify-between border-b px-3 py-2">
					<div>
						<p className="text-sm font-medium">Notifications</p>
						<p className="text-xs text-muted-foreground">
							{unreadCount} unread
						</p>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => markAllReadMutation.mutate()}
						disabled={markAllReadMutation.isPending || unreadCount === 0}>
						Mark all read
					</Button>
				</div>
				<ScrollArea className="max-h-80 smooth-div">
					{notifications.length === 0 ? (
						<div className="px-3 py-6 text-sm text-muted-foreground text-center">
							No notifications yet.
						</div>
					) : (
						notifications.map((item) => {
							const isUnread = !item.isRead;
							return (
								<DropdownMenuItem
									key={item.id}
									className="items-start gap-3 border-b rounded-none last:border-b-0 px-3 py-3"
									onClick={() => {
										if (
											isUnread &&
											!markReadMutation.isPending
										) {
											markReadMutation.mutate({
												ids: [item.id],
											});
										}
									}}>
									<span
										className={`mt-1.5 h-2 w-2 rounded-full ${
											isUnread
												? "bg-primary"
												: "bg-transparent"
										}`}
									/>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium truncate">
											{item.title}
										</p>
										{item.body ? (
											<p className="text-xs text-muted-foreground truncate mt-0.5">
												{item.body}
											</p>
										) : null}
										<p className="text-[11px] text-muted-foreground mt-1">
											{formatCreatedAt(
												item.createdAt as string,
											)}
										</p>
									</div>
								</DropdownMenuItem>
							);
						})
					)}
				</ScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
