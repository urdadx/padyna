import { Button } from "@/components/ui/button";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmileIcon } from "lucide-react";
import { useState } from "react";

type WidgetEmojiPickerProps = {
	disabled?: boolean;
	onEmojiSelect: (emoji: string) => void;
};

export function WidgetEmojiPicker({ disabled, onEmojiSelect }: WidgetEmojiPickerProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Add emoji"
						disabled={disabled}
						className="size-7 text-muted-foreground hover:text-foreground"
					/>
				}>
				<SmileIcon />
			</PopoverTrigger>
			<PopoverContent side="top" align="end" className="w-fit gap-0 p-0">
				<EmojiPicker
					className="h-[300px]"
					onEmojiSelect={({ emoji }) => {
						onEmojiSelect(emoji);
						setOpen(false);
					}}>
					<EmojiPickerSearch />
					<EmojiPickerContent />
					<EmojiPickerFooter />
				</EmojiPicker>
			</PopoverContent>
		</Popover>
	);
}
