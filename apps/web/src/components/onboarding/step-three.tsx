import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ColorPickerDialog } from "../color-picker-dialog";
import { MoreHorizontal, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import PadynaLogo from "@/assets/images/logo.svg";
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
import { useId } from "react";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TrashBinLinear } from "@/assets/icons/trash-icon";

export const StepThree = ({ onBack }: { onBack: () => void }) => {
	const [agentName, setAgentName] = useState("Padyna");
	const [_primaryColor, setPrimaryColor] = useState("#000000");
	const [agentIcon, setAgentIcon] = useState(PadynaLogo);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const id = useId();

	const navigate = useNavigate();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				if (event.target?.result) {
					setAgentIcon(event.target.result as string);
				}
			};
			reader.readAsDataURL(file);
		}
	};

	const handleDeleteIcon = () => {
		setAgentIcon("");
		setIsDeleteDialogOpen(false);
	};

	const handleContinue = () => {
		navigate({
			to: "/onboarding/pricing",
		});
	};

	return (
		<div className="p-6 md:p-12 flex flex-col justify-center h-full max-w-lg mx-auto w-full relative">
			<div className="flex flex-col gap-2 mb-6  ">
				<h1 className="text-3xl font-semibold">Customize your agent</h1>
				<p className="text-muted-foreground leading-relaxed">
					Style your agent to match your brand. You can customize it further in
					the settings later.
				</p>

				<div className="flex flex-col gap-5 mt-4">
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Agent name
						</Label>
						<Input
							value={agentName}
							onChange={(e) => setAgentName(e.target.value)}
							placeholder="Dub"
							className=""
						/>
					</div>

					<div className="flex items-center justify-between">
						<Label className="text-muted-foreground font-medium">
							Primary color
						</Label>
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-2">
								<ColorPickerDialog
									onColorSelect={setPrimaryColor}
									isUpdating={false}
								/>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3">
						<Label
							className="text-muted-foreground font-medium"
							htmlFor={id}>
							Use case
						</Label>
						<Select defaultValue="Customer Support">
							<SelectTrigger className="w-full" id={id}>
								<SelectValue placeholder="Select use case" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Customer Support">
									Customer Support
								</SelectItem>
								<SelectItem value="Technical Support">
									Technical Support
								</SelectItem>
								<SelectItem value="Sales Representative">
									Sales Representative
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Agent icon
						</Label>
						<div className="flex  items-center justify-between">
							<input
								type="file"
								ref={fileInputRef}
								className="hidden"
								accept="image/*"
								onChange={handleFileChange}
							/>
							<Avatar className="w-12 h-12 rounded-md">
								<AvatarImage
									className="rounded-md"
									src={agentIcon}
								/>
								<AvatarFallback className="bg-muted rounded-md text-muted-foreground">
									{agentName?.charAt(0) || "P"}
								</AvatarFallback>
							</Avatar>
							<Popover>
								<PopoverTrigger>
									<Button
										variant="outline"
										size="icon"
										className="rounded-lg">
										<MoreHorizontal className="w-4 h-4" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-40 p-1" align="end">
									<div className="flex flex-col">
										<Button
											variant="ghost"
											size="sm"
											className="justify-start gap-2 font-normal"
											onClick={() =>
												fileInputRef.current?.click()
											}>
											<RefreshCw className="w-4 h-4" />
											Replace
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="justify-start gap-2 font-normal text-destructive hover:text-destructive"
											onClick={() =>
												setIsDeleteDialogOpen(true)
											}>
											<TrashBinLinear
												color="red"
												className="w-4 h-4 "
											/>
											Delete
										</Button>
									</div>
								</PopoverContent>
							</Popover>
						</div>
					</div>
				</div>

				<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="text-xl font-semibold">
								Delete agent icon?
							</AlertDialogTitle>
							<AlertDialogDescription>
								This will remove the current icon for your agent.
								You can upload a new one at any time.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
							<AlertDialogAction
								size="sm"
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								onClick={handleDeleteIcon}>
								<span className="text-white">Yes, delete</span>
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			<div className="flex flex-col gap-2">
				<Button onClick={handleContinue} type="button">
					I like this
				</Button>
				<Button
					className="text-gray-500"
					variant="ghost"
					type="button"
					onClick={onBack}>
					Go Back
				</Button>
			</div>
		</div>
	);
};
