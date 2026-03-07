import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { motion } from "motion/react";

interface TextSource {
	title: string;
	content: string;
}

interface TextSourceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (source: TextSource) => void;
	defaultValues?: TextSource;
}

export function TextSourceDialog({
	open,
	onOpenChange,
	onSave,
	defaultValues,
}: TextSourceDialogProps) {
	const [title, setTitle] = React.useState(defaultValues?.title || "");
	const [content, setContent] = React.useState(defaultValues?.content || "");

	React.useEffect(() => {
		if (open) {
			setTitle(defaultValues?.title || "");
			setContent(defaultValues?.content || "");
		}
	}, [open, defaultValues]);

	const handleSave = () => {
		onSave({ title, content });
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl w-full">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Add Text Source
					</DialogTitle>
					<DialogDescription className="leading-relaxed">
						Add plain text sources to train your agent with specific
						information
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							placeholder="Ex: Refund Policy"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="content">Content</Label>
						<Textarea
							id="content"
							placeholder="Enter your content here..."
							className="min-h-20"
							value={content}
							onChange={(e) => setContent(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<motion.div
						className="w-full"
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}>
						<Button
							className="w-full"
							onClick={handleSave}
							disabled={!title.trim() || !content.trim()}>
							Add Text Source
						</Button>
					</motion.div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
