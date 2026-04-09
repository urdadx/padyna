import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { PlayLinear } from "@/assets/icons/play-icon";
import { Ban, X } from "lucide-react";
import { PenLinear } from "@/assets/icons/pen-icon";
import { ChecklistLinear } from "@/assets/icons/checklist-icon";

interface ActionsMultiSelectToolbarProps {
	onSelectAll: () => void;
	onToggleEnabled: () => void;
	onDelete: () => void;
	onEdit: () => void;
	onClose: () => void;
	isAllSelected?: boolean;
	isSingleSelection?: boolean;
	enableLabel: "Enable" | "Disable";
	isToggling?: boolean;
	isDeleting?: boolean;
}

export function ActionsMultiSelectToolbar({
	onSelectAll,
	onToggleEnabled,
	onDelete,
	onEdit,
	onClose,
	isAllSelected,
	isSingleSelection,
	enableLabel,
	isToggling,
	isDeleting,
}: ActionsMultiSelectToolbarProps) {
	const isEnabling = enableLabel === "Enable";
	const toggleLabel = isToggling ? (isEnabling ? "Enabling..." : "Disabling...") : enableLabel;
	const ToggleIcon = isEnabling ? PlayLinear : Ban;
	const selectAllLabel = isAllSelected ? "Unselect all" : "Select all";

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
					disabled={isDeleting || isToggling}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] hover:bg-accent hover:text-accent-foreground">
					<ChecklistLinear className="h-4 w-4" />
					{selectAllLabel}
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onClick={onToggleEnabled}
					disabled={isToggling || isDeleting}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] hover:bg-accent hover:text-accent-foreground">
					<ToggleIcon className="h-4 w-4 text-gray-400" />
					{toggleLabel}
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onClick={onDelete}
					disabled={isDeleting || isToggling}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] text-destructive hover:bg-destructive/10 hover:text-destructive">
					<TrashBinLinear color="red" className="h-4 w-4" />
					{isDeleting ? "Deleting..." : "Delete"}
				</Button>

				<Button
					variant="ghost"
					size="sm"
					onClick={onEdit}
					disabled={!isSingleSelection || isDeleting || isToggling}
					className="gap-1.5 rounded-md px-1.5 py-1 h-auto text-[13px] hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
					<PenLinear className="h-4 w-4" />
					Edit
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
