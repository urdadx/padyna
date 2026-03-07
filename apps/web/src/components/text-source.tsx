import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TextSourceProps {
	onSave?: (source: { title: string; content: string }) => void;
}

export function TextSource({ onSave }: TextSourceProps) {
	const [title, setTitle] = React.useState("");
	const [content, setContent] = React.useState("");

	const handleSave = () => {
		if (onSave) {
			onSave({ title, content });
		} else {
			console.log("Saving Text Source:", { title, content });
		}
		setTitle("");
		setContent("");
	};

	return (
		<div className="flex flex-col gap-4 rounded-xl border p-5">
			<div className="flex flex-col gap-2">
				<h2 className="font-semibold text-xl">Text snippets</h2>
				<p className="text-semibold text-base text-muted-foreground">
					Add plain text snippets to train your agent with specific information
				</p>
			</div>
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
			<div className="flex justify-end">
				<Button
					className="w-full sm:w-auto"
					onClick={handleSave}
					disabled={!title.trim() || !content.trim()}>
					Add text snippet
				</Button>
			</div>
		</div>
	);
}
