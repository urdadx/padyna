import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface FilterByStatusProps {
	value: string | undefined;
	onChange: (value: string | undefined) => void;
}

export const FilterByStatus = ({ value, onChange }: FilterByStatusProps) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline" className="h-9 font-normal">
					{value ? value : "All Status"}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={() => onChange(undefined)}>
					All status
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onChange("Synced")}>
					<div className="bg-green-500 w-2 h-2 rounded-full mr-2" />
					Synced
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onChange("Processing")}>
					<div className="bg-amber-500 w-2 h-2 rounded-full mr-2" />
					Processing
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onChange("Failed")}>
					<div className="bg-destructive w-2 h-2 rounded-full mr-2" />
					Failed
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
