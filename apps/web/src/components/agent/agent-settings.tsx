import { useState, useRef, useEffect } from "react";
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
import { Skeleton } from "../ui/skeleton";

import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { UploadLinear } from "@/assets/icons/upload-icon";
import { useSession } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { RowSkeleton } from "./row-skeleton";

export const AGENT_USECASES = [
	{ label: "Customer Support", value: "support" },
	{ label: "Technical Copilot", value: "technical" },
	{ label: "Sales Representative", value: "sales" },
] as const;

type Usecase = (typeof AGENT_USECASES)[number]["value"];

export function AgentSettingsPanel() {
	const { data: session } = useSession();
	const chatbotId = session?.session.activeChatbot;
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [form, setForm] = useState({
		name: "",
		primaryColor: "#6366f1",
		image: "",
		usecase: "support" as Usecase,
		initialMessage: "Hi, What can I help you with?",
		hidePoweredBy: false,
		isEnabled: true,
		suggestedMessages: [] as string[],
		allowedDomains: [] as string[],
	});

	const { data: chatbot, isLoading } = useQuery({
		...trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! }),
		enabled: !!chatbotId,
	});

	const updateMutation = useMutation({
		...trpc.agentsettings.updateChatbot.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getChatbot.queryOptions({ id: chatbotId! })
					.queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.agentsettings.getAllChatbots.queryOptions().queryKey,
			});
			toast.success("Changes saved");
		},
		onError: (err) => toast.error(err.message),
	});

	useEffect(() => {
		if (chatbot) {
			setForm({
				name: chatbot.name || "",
				primaryColor: chatbot.primaryColor || "#6366f1",
				image: chatbot.image || "",
				usecase: (chatbot.usecase as Usecase) || "support",
				initialMessage: chatbot.initialMessage || "Hi, What can I help you with?",
				hidePoweredBy: chatbot.hidePoweredBy || false,
				isEnabled: chatbot.isEnabled ?? true,
				suggestedMessages: chatbot.suggestedMessages || [],
				allowedDomains: chatbot.allowedDomains || [],
			});
		}
	}, [chatbot]);

	const save = (updates: Partial<typeof form>) => {
		if (chatbotId) updateMutation.mutate({ id: chatbotId, ...updates });
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const result = event.target?.result as string;
			setForm((prev) => ({ ...prev, image: result }));
			save({ image: result });
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="flex h-full min-h-0 flex-col gap-6 bg-background pr-1">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
				{isLoading ? (
					<Skeleton className="h-6 w-12" />
				) : (
					<Switch
						checked={form.isEnabled}
						onCheckedChange={(val) => {
							setForm((p) => ({ ...p, isEnabled: val }));
							save({ isEnabled: val });
						}}
					/>
				)}
			</div>

			<div className="flex flex-col gap-6 pb-6">
				<RowSkeleton label="Agent name" isLoading={isLoading}>
					<Input
						value={form.name}
						onChange={(e) =>
							setForm((p) => ({ ...p, name: e.target.value }))
						}
						onBlur={() => save({ name: form.name })}
						placeholder="Padyna Agent"
					/>
				</RowSkeleton>

				<RowSkeleton
					label="Agent icon"
					isLoading={isLoading}
					skeletonClassName="h-12 w-12">
					<div className="flex items-center justify-between">
						<Avatar className="w-12 h-12 rounded-md">
							<AvatarImage
								src={form.image}
								className="object-cover w-full h-full rounded-md"
							/>
							<AvatarFallback className="rounded-md">
								{form.name.charAt(0) || "P"}
							</AvatarFallback>
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
										/>
										Upload new icon
									</Button>
									<Button
										variant="ghost"
										className="w-full justify-start gap-2 text-destructive hover:text-destructive"
										onClick={() => {
											setForm((p) => ({
												...p,
												image: "",
											}));
											save({ image: undefined });
										}}>
										<TrashBinLinear
											color="red"
											className="w-4 h-4"
										/>
										Delete
									</Button>
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</RowSkeleton>

				<RowSkeleton label="Use case" isLoading={isLoading}>
					<Select
						items={AGENT_USECASES}
						value={form.usecase}
						onValueChange={(val) => {
							if (!val) return;
							setForm((p) => ({ ...p, usecase: val }));
							save({ usecase: val });
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
				</RowSkeleton>

				<div className="flex items-center justify-between">
					<Label className="text-muted-foreground font-medium">
						Primary color
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

				<RowSkeleton label="Welcome message" isLoading={isLoading}>
					<Input
						value={form.initialMessage}
						onChange={(e) =>
							setForm((p) => ({ ...p, initialMessage: e.target.value }))
						}
						onBlur={() => save({ initialMessage: form.initialMessage })}
					/>
				</RowSkeleton>

				<RowSkeleton label="Suggested messages">
					<div className="flex flex-col gap-3 w-full ">
						{form.suggestedMessages.map((msg, idx) => (
							<div key={idx} className="flex items-center gap-1">
								<Input
									value={msg}
									onChange={(e) => {
										const newMsgs = [
											...form.suggestedMessages,
										];
										newMsgs[idx] = e.target.value;
										setForm((p) => ({
											...p,
											suggestedMessages: newMsgs,
										}));
									}}
									onBlur={() =>
										save({
											suggestedMessages:
												form.suggestedMessages,
										})
									}
									placeholder="Enter suggested message..."
								/>
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0"
									onClick={() => {
										const newMsgs =
											form.suggestedMessages.filter(
												(_, i) => i !== idx,
											);
										setForm((p) => ({
											...p,
											suggestedMessages: newMsgs,
										}));
										save({
											suggestedMessages: newMsgs,
										});
									}}>
									<TrashBinLinear
										color="red"
										className="w-4 h-4 "
									/>
								</Button>
							</div>
						))}
						<Button
							variant="outline"
							className="w-full justify-center"
							onClick={() => {
								setForm((p) => ({
									...p,
									suggestedMessages: [
										...p.suggestedMessages,
										"",
									],
								}));
							}}>
							<Plus size={14} /> Add suggested message
						</Button>
					</div>
				</RowSkeleton>

				<RowSkeleton
					label="Allowed domains"
					description={<InfoIcon className="size-3.5 text-muted-foreground" />}>
					<div className="flex flex-col gap-3 w-full ">
						{form.allowedDomains.map((domain, idx) => (
							<div key={idx} className="flex items-center gap-1">
								<Input
									value={domain}
									onChange={(e) => {
										const newDomains = [
											...form.allowedDomains,
										];
										newDomains[idx] = e.target.value;
										setForm((p) => ({
											...p,
											allowedDomains: newDomains,
										}));
									}}
									onBlur={() =>
										save({
											allowedDomains:
												form.allowedDomains,
										})
									}
									placeholder="e.g., example.com"
								/>
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0"
									onClick={() => {
										const newDomains =
											form.allowedDomains.filter(
												(_, i) => i !== idx,
											);
										setForm((p) => ({
											...p,
											allowedDomains: newDomains,
										}));
										save({
											allowedDomains: newDomains,
										});
									}}>
									<TrashBinLinear
										color="red"
										className="w-4 h-4 "
									/>
								</Button>
							</div>
						))}
						<Button
							variant="outline"
							className="w-full justify-center"
							onClick={() => {
								setForm((p) => ({
									...p,
									allowedDomains: [...p.allowedDomains, ""],
								}));
							}}>
							<Plus size={14} /> Add allowed domain
						</Button>
					</div>
				</RowSkeleton>

				<div className="flex items-center justify-between">
					<Label className="text-muted-foreground font-medium">
						Hide "Powered by Padyna"
					</Label>
					{isLoading ? (
						<Skeleton className="h-6 w-12" />
					) : (
						<Switch
							checked={form.hidePoweredBy}
							onCheckedChange={(val) => {
								setForm((p) => ({ ...p, hidePoweredBy: val }));
								save({ hidePoweredBy: val });
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
