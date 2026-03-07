import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const FilterByStatus = () => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline" className="h-9 font-normal">
					Status
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>
					<div className="bg-green-500 w-2 h-2 rounded-full" />
					Completed
				</DropdownMenuItem>
				<DropdownMenuItem>
					<div className="bg-amber-500 w-2 h-2 rounded-full" />
					Processing
				</DropdownMenuItem>
				<DropdownMenuItem>
					<div className="bg-destructive w-2 h-2 rounded-full" />
					Failed
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
