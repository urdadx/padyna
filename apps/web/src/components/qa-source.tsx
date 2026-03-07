import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface QASourceProps {
	onSave?: (source: { question: string; answer: string }) => void;
}

export function QASource({ onSave }: QASourceProps) {
	const [question, setQuestion] = React.useState("");
	const [answer, setAnswer] = React.useState("");

	const handleSave = () => {
		if (onSave) {
			onSave({ question, answer });
		} else {
			console.log("Saving Q&A:", { question, answer });
		}
		setQuestion("");
		setAnswer("");
	};

	return (
		<div className="flex flex-col gap-4 rounded-xl border p-5">
			<div className="flex flex-col gap-2">
				<h2 className="font-semibold text-xl">Q&A</h2>
				<p className="text-semibold text-base text-muted-foreground">
					Train your agent on answers for key questions asked by customers
				</p>
			</div>
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

			<div className="flex justify-end">
				<Button
					className="w-full sm:w-auto"
					onClick={handleSave}
					disabled={!question.trim() || !answer.trim()}>
					Add question
				</Button>
			</div>
		</div>
	);
}
