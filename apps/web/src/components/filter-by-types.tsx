import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const FilterByTypes = () => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline" className="h-9 font-normal">
					All types
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>Files</DropdownMenuItem>
				<DropdownMenuItem>Links</DropdownMenuItem>
				<DropdownMenuItem>Q&A</DropdownMenuItem>
				<DropdownMenuItem>Text snippets</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
