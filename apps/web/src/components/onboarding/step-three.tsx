import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ColorPickerDialog } from "../color-picker-dialog";
import { MoreHorizontal } from "lucide-react";
import { useReducer, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useNavigate } from "@tanstack/react-router";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { RestartLinear } from "@/assets/icons/restart-icon";
import { useSession } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AGENT_USECASES } from "../agent/agent-settings";

type AgentUsecase = "support" | "technical" | "sales";

type StepThreeState = {
	agentName: string;
	primaryColor: string;
	agentIcon: string;
	isDeleteDialogOpen: boolean;
	usecase: AgentUsecase;
};

function createStepThreeState(chatbot?: {
	id?: string;
	image?: string | null;
	name?: string | null;
	primaryColor?: string | null;
	usecase?: AgentUsecase | null;
} | null): StepThreeState {
	return {
		agentName: chatbot?.name || "",
		primaryColor: chatbot?.primaryColor || "#6366f1",
		agentIcon: chatbot?.image || "",
		isDeleteDialogOpen: false,
		usecase: chatbot?.usecase || "support",
	};
}

function stepThreeReducer(state: StepThreeState, action: Partial<StepThreeState>) {
	return { ...state, ...action };
}

function StepThreeContent({
	initialState,
	onBack,
	onContinue,
	saveChanges,
}: {
	initialState: StepThreeState;
	onBack: () => void;
	onContinue: () => void;
	saveChanges: (state: StepThreeState) => void;
}) {
	const [state, updateState] = useReducer(stepThreeReducer, initialState);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { agentIcon, agentName, isDeleteDialogOpen, primaryColor, usecase } = state;

	const persistChanges = (overrides: Partial<StepThreeState>) => {
		const nextState = { ...state, ...overrides };
		saveChanges(nextState);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				if (event.target?.result) {
					const newIcon = event.target.result as string;
					updateState({ agentIcon: newIcon });
					persistChanges({ agentIcon: newIcon });
				}
			};
			reader.readAsDataURL(file);
		}
	};

	const handleDeleteIcon = () => {
		updateState({ agentIcon: "", isDeleteDialogOpen: false });
		persistChanges({ agentIcon: "", isDeleteDialogOpen: false });
	};

	return (
		<div className="relative mx-auto flex h-full min-h-0 w-full max-w-lg flex-col p-6 sm:p-10 sm:pt-14">
			<div className="mb-6 min-h-0 flex-1 overflow-y-auto pr-1">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-semibold">Customize your agent</h1>
					<p className="text-muted-foreground leading-relaxed">
						Style your AI agent to match your brand. You can customize it further in the settings
						later.
					</p>

					<div className="mt-4 flex flex-col gap-5">
						<div className="flex flex-col gap-3">
							<Label className="text-muted-foreground font-medium">Agent name</Label>
							<Input
								value={agentName}
								onChange={(e) => updateState({ agentName: e.target.value })}
								onBlur={() => saveChanges(state)}
								placeholder="Padyna Assistant"
								className=""
							/>
						</div>

						<div className="flex items-center justify-between">
							<Label className="text-muted-foreground font-medium">Brand color</Label>
							<div className="flex items-center gap-2">
								<div className="flex items-center gap-2">
									<ColorPickerDialog
										initialColor={primaryColor}
										onColorSelect={(color) => {
											updateState({ primaryColor: color });
											persistChanges({ primaryColor: color });
										}}
										isUpdating={false}
									/>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<Label className="text-muted-foreground font-medium">Use case</Label>
							<Select
								items={AGENT_USECASES}
								value={usecase}
								onValueChange={(value) => {
									const nextUsecase = value as AgentUsecase;
									updateState({ usecase: nextUsecase });
									persistChanges({ usecase: nextUsecase });
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select use case" />
								</SelectTrigger>
								<SelectContent>
									{AGENT_USECASES.map((option) => (
										<SelectItem key={option.value} value={option.value} className="rounded-lg">
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-3">
							<Label className="text-muted-foreground font-medium">Agent icon</Label>
							<div className="flex  items-center justify-between">
								<input
									type="file"
									ref={fileInputRef}
									className="hidden"
									accept="image/*"
									onChange={handleFileChange}
								/>
								<Avatar className="w-12 h-12 rounded-md">
									<AvatarImage className="rounded-md" src={agentIcon} />
									<AvatarFallback className="bg-muted rounded-md text-muted-foreground">
										{agentName?.charAt(0) || "P"}
									</AvatarFallback>
								</Avatar>
								<Popover>
									<PopoverTrigger>
										<Button variant="outline" size="icon" className="rounded-lg">
											<MoreHorizontal className="w-4 h-4" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-40 p-1" align="end">
										<div className="flex flex-col">
											<Button
												variant="ghost"
												size="sm"
												className="justify-start gap-2 font-normal"
												onClick={() => fileInputRef.current?.click()}
											>
												<RestartLinear color="black" className="w-4 h-4" />
												Replace
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="justify-start gap-2 font-normal text-destructive hover:text-destructive"
												onClick={() => updateState({ isDeleteDialogOpen: true })}
											>
												<TrashBinLinear color="red" className="w-4 h-4 " />
												Delete
											</Button>
										</div>
									</PopoverContent>
								</Popover>
							</div>
						</div>
					</div>

					<AlertDialog
						open={isDeleteDialogOpen}
						onOpenChange={(open) => updateState({ isDeleteDialogOpen: open })}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle className="text-xl font-semibold">
									Delete agent icon?
								</AlertDialogTitle>
								<AlertDialogDescription>
									This will remove the current icon for your agent. You can upload a new one at any
									time.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
								<AlertDialogAction
									size="sm"
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									onClick={handleDeleteIcon}
								>
									<span className="text-white">Yes, delete</span>
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Button onClick={onContinue} type="button">
					Continue
				</Button>
				<Button className="text-gray-500" variant="ghost" type="button" onClick={onBack}>
					Go Back
				</Button>
			</div>
		</div>
	);
}

export const StepThree = ({ onBack }: { onBack: () => void }) => {
  const { data: session } = useSession();
  const chatbotId = session?.session.activeChatbot;

  const navigate = useNavigate();

  const { data: chatbot } = useQuery({
    ...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
    enabled: !!chatbotId,
    refetchOnMount: true,
  });

  const updateMutation = useMutation({
    ...trpc.agentsettings.updateChatbot.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }).queryKey,
      });
    },
  });

  const saveChanges = (state: StepThreeState) => {
    if (!chatbotId) return;
    updateMutation.mutate({
      id: chatbotId,
      name: state.agentName,
      image: state.agentIcon || undefined,
      primaryColor: state.primaryColor,
      usecase: state.usecase,
    });
  };

  const handleContinue = () => {
    navigate({
      to: "/onboarding/pricing",
    });
  };

  return (
    <StepThreeContent
      key={chatbot?.id ?? "loading-chatbot"}
      initialState={createStepThreeState(chatbot)}
      onBack={onBack}
      onContinue={handleContinue}
      saveChanges={saveChanges}
    />
  );
};
