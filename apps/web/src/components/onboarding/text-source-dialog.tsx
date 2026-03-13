import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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
import api from "../../lib/api";
import { queryClient, trpc } from "../../utils/trpc";
import Spinner from "../ui/spinner";
import { useEffect, useState } from "react";

interface TextSource {
	id?: string;
	title: string;
	content: string;
}

interface TextSourceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultValues?: TextSource;
}

export function TextSourceDialog({ open, onOpenChange, defaultValues }: TextSourceDialogProps) {
	const [title, setTitle] = useState(defaultValues?.title || "");
	const [content, setContent] = useState(defaultValues?.content || "");

	const isEdit = Boolean(defaultValues?.id);

	const { mutate: saveText, isPending } = useMutation({
		mutationFn: async (data: { content: string; title?: string }) => {
			const url =
				isEdit && defaultValues?.id
					? `/api/ingestion/text/${defaultValues.id}`
					: "/api/ingestion/text";
			const method = isEdit ? api.put : api.post;
			const response = await method(url, data);
			return response.data;
		},
		onSuccess: () => {
			toast.success(isEdit ? "Text source updated" : "Text source added");
			queryClient.invalidateQueries({
				queryKey: trpc.datasource.getAll.queryOptions().queryKey,
			});
			onOpenChange(false);
		},
		onError: (error: any) => {
			toast.error(
				error.response?.data?.message ||
					(isEdit
						? "Failed to update text source"
						: "Failed to add text source"),
			);
		},
	});

	useEffect(() => {
		if (open) {
			setTitle(defaultValues?.title || "");
			setContent(defaultValues?.content || "");
		}
	}, [open, defaultValues]);

	const handleSave = () => {
		saveText({ content, title });
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
							disabled={!content.trim() || isPending}>
							{isPending ? (
								<>
									<Spinner color="white" />
									Saving...
								</>
							) : isEdit ? (
								"Update Text Source"
							) : (
								"Add Text Source"
							)}
						</Button>
					</motion.div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
