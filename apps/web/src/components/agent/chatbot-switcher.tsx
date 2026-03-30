import { PlusIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ArrowDownLinear } from "@/assets/icons/arrow-down";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateNewAgent } from "./create-new-agent";
import { toast } from "sonner";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";

export function ChatbotSwitcher() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const { data: session } = useSession();
	const activeChatbotId = session?.session.activeChatbot;

	const { data: chatbots, isLoading } = useQuery({
		...trpc.agentsettings.getAllChatbots.queryOptions(),
	});

	const activeChatbot = chatbots?.find((c) => c.id === activeChatbotId);

	const switchMutation = useMutation({
		...trpc.agentsettings.switchChatbots.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getAllChatbots.queryOptions().queryKey,
			});
		},
	});

	const handleSwitchChatbot = (chatbotId: string) => {
		toast.loading("Switching agent...");
		switchMutation.mutate(
			{ chatbotId: chatbotId as string },
			{
				onSuccess: async () => {
					window.location.reload();
				},
				onError: () => {
					toast.warning("An error occurred. Please try again.");
				},
			},
		);
	};

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem className="w-full">
					<DropdownMenu>
						<DropdownMenuTrigger className="w-full">
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-md w-full">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg">
									{isLoading ? (
										<Skeleton className="h-8 w-8 rounded-lg" />
									) : (
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage
												className="w-full h-full rounded-md"
												src={
													activeChatbot?.image ??
													""
												}
												alt={
													activeChatbot?.name ??
													""
												}
											/>
											{!activeChatbot?.image && (
												<AvatarFallback className="rounded-md h-full w-full bg-primary text-white font-semibold">
													{activeChatbot?.name?.charAt(
														0,
													) || "P"}
												</AvatarFallback>
											)}
										</Avatar>
									)}
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									{isLoading ? (
										<Skeleton className="h-4 w-24" />
									) : (
										<span className="truncate ">
											{activeChatbot?.name ||
												"Select agent"}
										</span>
									)}
								</div>
								<ArrowDownLinear className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width)  min-w-56 rounded-sm"
							side={"bottom"}
							align="end"
							sideOffset={4}>
							{isLoading ? (
								<>
									<Skeleton className="h-8 w-full mb-2" />
									<Skeleton className="h-8 w-full mb-2" />
									<Skeleton className="h-8 w-full" />
								</>
							) : (
								<>
									{chatbots?.map((chatbot) => (
										<DropdownMenuItem
											key={chatbot.id}
											className="text-sm flex items-center"
											onClick={() =>
												handleSwitchChatbot(
													chatbot.id,
												)
											}>
											<div
												className="rounded-full w-2 h-2"
												style={{
													backgroundColor:
														chatbot.primaryColor ||
														"#6366f1",
												}}
											/>
											{chatbot.name}
											{chatbot.id ===
												activeChatbotId && (
												<CheckMarkIcon
													color="green"
													className="w-4 h-4 ml-auto"
												/>
											)}
										</DropdownMenuItem>
									))}
									<DropdownMenuItem
										className="text-sm"
										onClick={() => setIsDialogOpen(true)}>
										<PlusIcon className="size-4 text-muted-foreground" />
										Create a new agent
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			<CreateNewAgent open={isDialogOpen} onOpenChange={setIsDialogOpen} />
		</>
	);
}
