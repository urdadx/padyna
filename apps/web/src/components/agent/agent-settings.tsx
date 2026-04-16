import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { InfoIcon, MoreHorizontal, Plus } from "lucide-react";

import { ColorPickerDialog } from "../color-picker-dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";

import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { UploadLinear } from "@/assets/icons/upload-icon";
import { useSession } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { AgentLoadingSkeleton } from "./agent-loading-skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { AddOnsDialog } from "../usage-billing/add-ons-dialog";
import { Dialog } from "../ui/dialog";
import { Drawer } from "../ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

export const AGENT_USECASES = [
	{ label: "Customer Support", value: "support" },
	{ label: "Technical Copilot", value: "technical" },
	{ label: "Sales Representative", value: "sales" },
];

type Usecase = (typeof AGENT_USECASES)[number]["value"];

export function AgentSettingsPanel() {
	const { data: session } = useSession();
	const chatbotId = session?.session.activeChatbot;

	const { data: chatbot, isLoading } = useQuery({
		...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
		enabled: !!chatbotId,
	});

	if (isLoading || !chatbot || !chatbotId) {
		return <AgentLoadingSkeleton />;
	}

	return <AgentForm chatbot={chatbot} chatbotId={chatbotId} />;
}

function getFormState(chatbot: any) {
	return {
		name: chatbot.name || "",
		primaryColor: chatbot.primaryColor || "#6366f1",
		image: chatbot.image || "",
		usecase: (chatbot.usecase as Usecase) || "support",
		initialMessage: chatbot.initialMessage || "Hi, What can I help you with?",
		hidePoweredBy: chatbot.hidePoweredBy || false,
		isEnabled: chatbot.isEnabled ?? true,
		suggestedMessages: chatbot.suggestedMessages || [],
		allowedDomains: chatbot.allowedDomains || [],
	};
}

function AgentForm({ chatbot, chatbotId }: { chatbot: any; chatbotId: string }) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const isMobile = useIsMobile();
	const [isBrandingDialogOpen, setIsBrandingDialogOpen] = useState(false);

	const [form, setForm] = useState(() => getFormState(chatbot));

	useEffect(() => {
		setForm(getFormState(chatbot));
	}, [chatbot]);

	const updateMutation = useMutation({
		...trpc.agentsettings.updateChatbot.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId })
					.queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getAllChatbots.queryOptions().queryKey,
			});
			toast.success("Changes saved");
		},
		onError: (err) => {
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId })
					.queryKey,
			});
			toast.error(err.message);
		},
	});

	const save = (updates: Partial<typeof form>) => {
		updateMutation.mutate({ id: chatbotId, ...updates });
	};

	const handleHidePoweredByChange = (hidePoweredBy: boolean) => {
		if (hidePoweredBy && !chatbot.canHidePoweredBy) {
			setForm((p) => ({ ...p, hidePoweredBy: false }));
			setIsBrandingDialogOpen(true);
			return;
		}

		setForm((p) => ({ ...p, hidePoweredBy }));
		save({ hidePoweredBy });
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const result = event.target?.result as string;
			setForm((p) => ({ ...p, image: result }));
			save({ image: result });
		};
		reader.readAsDataURL(file);
	};

	const brandingDialog = isMobile ? (
		<Drawer open={isBrandingDialogOpen} onOpenChange={setIsBrandingDialogOpen}>
			<AddOnsDialog defaultValue="branding" isMobile />
		</Drawer>
	) : (
		<Dialog open={isBrandingDialogOpen} onOpenChange={setIsBrandingDialogOpen}>
			<AddOnsDialog defaultValue="branding" isMobile={false} />
		</Dialog>
	);

	return (
		<>
			<div className="flex h-full min-h-0 flex-col gap-6 bg-background pr-1">
				<div className="flex justify-between items-center">
					<h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
					<Tooltip>
						<TooltipTrigger>
							<Switch
								checked={form.isEnabled}
								onCheckedChange={(val) => {
									setForm((p) => ({ ...p, isEnabled: val }));
									save({ isEnabled: val });
								}}
							/>
						</TooltipTrigger>
						<TooltipContent>
							Toggle to enable or disable the agent. When disabled, the
							agent will not respond to user interactions.
						</TooltipContent>
					</Tooltip>
				</div>

				<div className="flex flex-col gap-6 pb-6">
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium flex items-center gap-1.5">
							Agent name
						</Label>
						<Input
							value={form.name}
							onChange={(e) =>
								setForm((p) => ({ ...p, name: e.target.value }))
							}
							onBlur={() => save({ name: form.name })}
							placeholder="Padyna Agent"
						/>
					</div>
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium flex items-center gap-1.5">
							Agent icon
						</Label>
						<div className="flex items-center justify-between">
							<Avatar className="w-12 h-12 rounded-md">
								<AvatarImage
									src={form.image}
									className="object-cover w-full h-full rounded-md"
								/>
								{!form.image && (
									<AvatarFallback className="rounded-md">
										{form.name.charAt(0) || "P"}
									</AvatarFallback>
								)}
							</Avatar>

							<Popover>
								<PopoverTrigger>
									<Button variant="outline" size="icon">
										<MoreHorizontal className="w-4 h-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-40 p-1" align="end">
									<div className="flex flex-col">
										<input
											type="file"
											ref={fileInputRef}
											className="hidden"
											accept="image/*"
											onChange={handleImageUpload}
										/>
										<Button
											variant="ghost"
											className="w-full justify-start gap-2"
											onClick={() =>
												fileInputRef.current?.click()
											}>
											<UploadLinear
												color="black"
												className="w-4 h-4"
											/>{" "}
											Upload icon
										</Button>
										<Button
											variant="ghost"
											className="w-full justify-start gap-2 text-destructive hover:text-destructive"
											onClick={() => {
												setForm((p) => ({
													...p,
													image: "",
												}));
												save({ image: "" });
											}}>
											<TrashBinLinear
												color="red"
												className="w-4 h-4"
											/>{" "}
											Delete
										</Button>
									</div>
								</PopoverContent>
							</Popover>
						</div>
					</div>
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium flex items-center gap-1.5">
							Use case
						</Label>
						<Select
							items={AGENT_USECASES}
							value={form.usecase}
							onValueChange={(val: Usecase | null) => {
								if (val) {
									setForm((p) => ({ ...p, usecase: val }));
									save({ usecase: val });
								}
							}}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{AGENT_USECASES.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-muted-foreground font-medium">
							Brand color
						</Label>
						<ColorPickerDialog
							initialColor={form.primaryColor}
							onColorSelect={(color) => {
								setForm((p) => ({ ...p, primaryColor: color }));
								save({ primaryColor: color });
							}}
							isUpdating={updateMutation.isPending}
						/>
					</div>

					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Initial message
						</Label>
						<Input
							value={form.initialMessage}
							onChange={(e) =>
								setForm((p) => ({
									...p,
									initialMessage: e.target.value,
								}))
							}
							onBlur={() =>
								save({ initialMessage: form.initialMessage })
							}
						/>
					</div>

					<div className="flex flex-col gap-3 w-full">
						<Label className="text-muted-foreground font-medium">
							Suggested messages
						</Label>
						{form.suggestedMessages.map((msg: string, idx: number) => (
							<div key={idx} className="flex items-center gap-1">
								<Input
									value={msg}
									placeholder="Enter a suggested message..."
									onChange={(e) => {
										const next = [
											...form.suggestedMessages,
										];
										next[idx] = e.target.value;
										setForm((p) => ({
											...p,
											suggestedMessages: next,
										}));
									}}
									onBlur={() =>
										save({
											suggestedMessages:
												form.suggestedMessages,
										})
									}
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => {
										const next =
											form.suggestedMessages.filter(
												(_: any, i: number) =>
													i !== idx,
											);
										setForm((p) => ({
											...p,
											suggestedMessages: next,
										}));
										save({ suggestedMessages: next });
									}}>
									<TrashBinLinear
										color="red"
										className="w-4 h-4"
									/>
								</Button>
							</div>
						))}
						<Button
							variant="outline"
							onClick={() =>
								setForm((p) => ({
									...p,
									suggestedMessages: [
										...p.suggestedMessages,
										"",
									],
								}))
							}>
							<Plus size={14} /> Add suggested message
						</Button>
					</div>

					<div className="flex flex-col gap-3 w-full">
						<Label className="text-muted-foreground font-medium">
							Allowed domains
							<Tooltip>
								<TooltipTrigger>
									<InfoIcon className="size-4" />
								</TooltipTrigger>
								<TooltipContent>
									If specified, the chat widget will only be
									shown on these domains.
								</TooltipContent>
							</Tooltip>
						</Label>
						{form.allowedDomains.map((domain: string, idx: number) => (
							<div key={idx} className="flex items-center gap-1">
								<Input
									value={domain}
									placeholder="Enter an allowed url..."
									onChange={(e) => {
										const next = [...form.allowedDomains];
										next[idx] = e.target.value;
										setForm((p) => ({
											...p,
											allowedDomains: next,
										}));
									}}
									onBlur={() =>
										save({
											allowedDomains:
												form.allowedDomains,
										})
									}
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => {
										const next = form.allowedDomains.filter(
											(_: any, i: number) => i !== idx,
										);
										setForm((p) => ({
											...p,
											allowedDomains: next,
										}));
										save({ allowedDomains: next });
									}}>
									<TrashBinLinear
										color="red"
										className="w-4 h-4"
									/>
								</Button>
							</div>
						))}
						<Button
							variant="outline"
							onClick={() =>
								setForm((p) => ({
									...p,
									allowedDomains: [...p.allowedDomains, ""],
								}))
							}>
							<Plus size={14} /> Add allowed domain
						</Button>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-muted-foreground font-medium">
							Hide "Powered by Padyna" text
						</Label>
						<Switch
							checked={form.hidePoweredBy}
							onCheckedChange={handleHidePoweredByChange}
						/>
					</div>
				</div>
			</div>
			{brandingDialog}
		</>
	);
}
