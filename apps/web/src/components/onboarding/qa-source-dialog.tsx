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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "../ui/input";
import { motion } from "motion/react";

interface QASource {
	question: string;
	answer: string;
}

interface QASourceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (source: QASource) => void;
	defaultValues?: QASource;
}

export function QASourceDialog({ open, onOpenChange, onSave, defaultValues }: QASourceDialogProps) {
	const [question, setQuestion] = React.useState(defaultValues?.question || "");
	const [answer, setAnswer] = React.useState(defaultValues?.answer || "");

	React.useEffect(() => {
		if (open) {
			setQuestion(defaultValues?.question || "");
			setAnswer(defaultValues?.answer || "");
		}
	}, [open, defaultValues]);

	const handleSave = () => {
		onSave({ question, answer });
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl w-full">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Add Q&A Source
					</DialogTitle>
					<DialogDescription className="leading-relaxed">
						Add a question and its corresponding answer to train your AI.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="question">Question</Label>
						<Input
							id="question"
							placeholder="Ex: How do I reset my password?"
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="answer">Answer</Label>
						<Textarea
							id="answer"
							placeholder="Enter the answer here..."
							className="min-h-20"
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
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
							disabled={!question.trim() || !answer.trim()}>
							Add Q&A
						</Button>
					</motion.div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
