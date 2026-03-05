import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "@/assets/icons/globe-icon";

interface LinkSourceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (links: string[]) => void;
	defaultLinks?: string[];
}

export function LinkSourceDialog({
	open,
	onOpenChange,
	onSave,
	defaultLinks = [],
}: LinkSourceDialogProps) {
	const [links, setLinks] = React.useState<string[]>(defaultLinks);
	const [newLink, setNewLink] = React.useState("");

	React.useEffect(() => {
		if (open) {
			setLinks(defaultLinks);
		}
	}, [open, defaultLinks]);

	const addLink = () => {
		if (newLink && !links.includes(newLink)) {
			setLinks([...links, newLink]);
			setNewLink("");
		}
	};

	const removeLink = (index: number) => {
		setLinks(links.filter((_, i) => i !== index));
	};

	const handleSave = () => {
		addLink(); // Ensure the current input is added before saving
		onSave(links);
		onOpenChange(false);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addLink();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl w-full">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">Add Links</DialogTitle>
					<DialogDescription className="leading-relaxed">
						Add URLs to your website, youtube videos etc to train your AI
						agent.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="url">
							URL
							<span className="text-muted-foreground">
								(Press Enter to add)
							</span>
						</Label>
						<div className="flex flex-col gap-2">
							<Input
								id="url"
								placeholder="https://padyna.com"
								value={newLink}
								onChange={(e) => setNewLink(e.target.value)}
								onKeyDown={handleKeyPress}
							/>
						</div>
					</div>

					{links.length > 0 && (
						<div className="flex flex-col gap-2 max-h-50 overflow-y-auto pr-2">
							{links.map((link, index) => (
								<div
									key={index}
									className="flex items-center justify-between">
									<div className="flex items-center gap-3 overflow-hidden">
										<Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
										<span className="truncate text-sm font-medium">
											{link}
										</span>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => removeLink(index)}
										className="h-8 w-8 text-destructive">
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						className="w-full"
						onClick={handleSave}
						disabled={links.length === 0}>
						{`Add ${links.length} Links`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
