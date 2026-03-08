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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function ChatbotSwitcher() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [agentName, setAgentName] = useState("");
	const [useCase, setUseCase] = useState("");

	const activeBot = {
		name: "Padyna Bot",
		avatar: "/avatars/activeBot-a.jpg",
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
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										src={activeBot.avatar}
										alt={activeBot.name}
									/>
									<AvatarFallback className="rounded-lg bg-primary text-white font-semibold">
										P
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate ">
										{activeBot.name}
									</span>
								</div>
								<ArrowDownLinear className="ml-auto size-4" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width)  min-w-56 rounded-sm"
							side={"bottom"}
							align="end"
							sideOffset={4}>
							<DropdownMenuItem className="text-sm">
								<div className="rounded-full w-2 h-2 bg-orange-500" />
								Padyna agent
							</DropdownMenuItem>
							<DropdownMenuItem className="text-sm">
								<div className="rounded-full w-2 h-2 bg-green-500" />
								Jack agent
							</DropdownMenuItem>
							<DropdownMenuItem className="text-sm">
								<div className="rounded-full w-2 h-2 bg-blue-500" />
								Ruth agent
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-sm"
								onClick={() => setIsDialogOpen(true)}>
								<PlusIcon className="size-4 text-muted-foreground" />
								Create a new agent
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="w-full sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="text-xl font-semibold">
							Create a new agent
						</DialogTitle>
						<p className="text-sm text-muted-foreground">
							Enter the details below to create your new AI agent.
						</p>
					</DialogHeader>
					<div className="grid gap-3">
						<div className="flex flex-col gap-3">
							<Label className="text-muted-foreground font-medium">
								Agent name
							</Label>
							<Input
								value={agentName}
								onChange={(e) => setAgentName(e.target.value)}
								placeholder="Padyna Agent"
								className=""
							/>
						</div>
						<div className="flex flex-col gap-3">
							<Label className="text-muted-foreground font-medium">
								Use case
							</Label>
							<Select
								value={useCase}
								onValueChange={(value) => setUseCase(value || "")}
								defaultValue="Customer Support">
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select use case" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Customer Support">
										Customer Support
									</SelectItem>
									<SelectItem value="Technical Copilot">
										Technical Copilot
									</SelectItem>
									<SelectItem value="Sales Representative">
										Sales Representative
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<DialogClose>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button onClick={() => setIsDialogOpen(false)}>
							Add new agent
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
