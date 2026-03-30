import { trpc, queryClient } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AGENT_USECASES } from "./agent-settings";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "../ui/dialog";
import { SelectContent, Select, SelectTrigger, SelectItem, SelectValue } from "../ui/select";
import Spinner from "../ui/spinner";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AddOnsDialog } from "../usage-billing/add-ons-dialog";

interface CreateNewAgentProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const CreateNewAgent = ({ open, onOpenChange }: CreateNewAgentProps) => {
	const [agentName, setAgentName] = useState("");
	const [useCase, setUseCase] = useState<"support" | "technical" | "sales">("support");
	const [openAddonsDialog, setOpenAddonsDialog] = useState(false);

	const createMutation = useMutation({
		...trpc.agentsettings.createChatbot.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getAllChatbots.queryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getChatbotsCount.queryOptions().queryKey,
			});
			onOpenChange(false);
		},
		onError: (error) => {
			toast.warning(error.message || "Failed to create agent. Please try again.", {
				action: {
					label: "Upgrade",
					onClick: () => setOpenAddonsDialog(true),
				},
			});
		},
	});

	const handleCreateAgent = () => {
		if (!agentName.trim()) return;
		createMutation.mutate({
			name: agentName,
			usecase: useCase,
		});
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
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
								placeholder="Awesome AI Agent"
								className=""
							/>
						</div>
						<div className="flex flex-col gap-3">
							<Label className="text-muted-foreground font-medium">
								Use case
							</Label>
							<Select
								value={useCase}
								items={AGENT_USECASES}
								onValueChange={(value) =>
									setUseCase(
										value as
											| "support"
											| "technical"
											| "sales",
									)
								}
								defaultValue="support">
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select use case" />
								</SelectTrigger>
								<SelectContent>
									{AGENT_USECASES.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
											className="rounded-lg">
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<DialogClose>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							onClick={handleCreateAgent}
							disabled={!agentName.trim() || createMutation.isPending}>
							{createMutation.isPending ? (
								<>
									<Spinner className="text-white" />
									Creating your agent...
								</>
							) : (
								"Create a new agent"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog open={openAddonsDialog} onOpenChange={setOpenAddonsDialog}>
				<AddOnsDialog
					defaultValue="chatbot"
					isMobile={false}
				/>
			</Dialog>
		</>
	);
};
