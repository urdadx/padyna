import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";

import { CopyLinear } from "@/assets/icons/copy-icon";
import { X } from "lucide-react";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { RestartLinear } from "@/assets/icons/restart-icon";
import { ChecklistLinear } from "@/assets/icons/checklist-icon";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";

interface MultiSelectToolbarProps {
	onSelectAll: () => void;
	onCopyUrls: () => void;
	onDelete: () => void;
	onClose: () => void;
	isAllSelected?: boolean;
}

export function MultiSelectToolbar({
	onSelectAll,
	onCopyUrls,
	onDelete,
	onClose,
	isAllSelected,
}: MultiSelectToolbarProps) {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopy = () => {
		onCopyUrls();
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<motion.div
			initial={{ y: 100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			exit={{ y: 100, opacity: 0 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
			className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 motion-reduce:transition-none motion-reduce:animate-none">
			<div className="flex items-center rounded-lg bg-popover text-popover-foreground p-1 shadow-md ring-1 ring-foreground/10">
				<Button
					variant="ghost"
					size="sm"
					onClick={onSelectAll}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] hover:bg-accent hover:text-accent-foreground">
					<ChecklistLinear className="h-4 w-4" />
					{isAllSelected ? "Unselect All" : "Select All"}
				</Button>
				<div className="h-4 w-px bg-border mx-0.5 -my-1" />

				<Button
					variant="ghost"
					size="sm"
					onClick={handleCopy}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] hover:bg-accent hover:text-accent-foreground">
					{isCopied ? (
						<>
							<CheckMarkIcon color="green" className="h-4 w-4 " />
							Copied
						</>
					) : (
						<>
							<CopyLinear className="h-4 w-4" />
							Copy URLs
						</>
					)}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] hover:bg-accent hover:text-accent-foreground"
							/>
						}>
						<RestartLinear className="h-4 w-4" />
						Rescrape
					</DropdownMenuTrigger>
				</DropdownMenu>

				<Button
					variant="ghost"
					size="sm"
					onClick={onDelete}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] text-destructive hover:bg-destructive/10 hover:text-destructive">
					<TrashBinLinear color="red" className="h-4 w-4" />
					Delete
				</Button>
				<div className="h-4 w-px bg-border mx-0.5" />
				<Button
					variant="ghost"
					size="sm"
					onClick={onClose}
					className="rounded-md p-1 h-auto hover:bg-accent hover:text-accent-foreground"
					aria-label="Close multi-select toolbar">
					<X className="h-4 w-4" />
				</Button>
			</div>
		</motion.div>
	);
}
