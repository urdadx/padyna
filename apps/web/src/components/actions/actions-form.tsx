import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { AlertCircleIcon, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";

type ActionsFormProps = {
	onSubmit?: (data: { name: string; description: string; enabled: boolean }) => void;
	initialData?: {
		name?: string;
		description?: string;
		enabled?: boolean;
	};
};

export function ActionsForm({ onSubmit, initialData }: ActionsFormProps) {
	const [name, setName] = useState(initialData?.name ?? "");
	const [description, setDescription] = useState(initialData?.description ?? "");
	const [enabled, setEnabled] = useState(initialData?.enabled ?? true);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit?.({ name, description, enabled });
	};

	return (
		<div className="container mx-auto max-w-3xl p-4">
			<Link to="/actions">
				<Button size="sm" variant="outline" className="mb-2">
					<ArrowLeft />
					Back
				</Button>
			</Link>
			<div className="flex justify-between items-center mt-2 mb-6">
				<h1 className="text-2xl font-semibold tracking-tight">
					Book calendly slots
				</h1>
				<Tooltip>
					<TooltipTrigger>
						<Switch
							id="enabled"
							checked={enabled}
							onCheckedChange={setEnabled}
						/>
					</TooltipTrigger>
					<TooltipContent>
						<p>Disable this action</p>
					</TooltipContent>
				</Tooltip>
			</div>
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="space-y-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="name">Action name</Label>
						<small className="text-muted-foreground">
							Give your action a name that clearly describes its
							purpose.
						</small>
					</div>
					<Input
						id="name"
						placeholder="Enter action name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="name">
						Select your preferred event <AlertCircleIcon size={14} />{" "}
					</Label>
					<Select>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select event type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="event1">Event Type 1</SelectItem>
							<SelectItem value="event2">Event Type 2</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="description">When to use</Label>
						<small className="text-muted-foreground">
							Describe when this action should be triggered. The
							description should provide clear guidance on the intended
							use case for this action.
						</small>
					</div>
					<Textarea
						id="description"
						className="w-full"
						placeholder="Enter a description for when to use this action"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>
				<div className="flex justify-end">
					<Button type="submit" variant="default">
						Save and continue
					</Button>
				</div>
			</form>
		</div>
	);
}
