import { RestartLinear } from "@/assets/icons/restart-icon";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { MoreHorizontal } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import type { Item } from "./datasource-table";
import { PenLinear } from "@/assets/icons/pen-icon";

export const DataSourceActions = ({ item }: { item: Item }) => {
	const { type } = item;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button className="h-8 w-8 p-0" variant="outline">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>
						{type === "Link" ? (
							<>
								<RestartLinear className="size-4" />
								Resync
							</>
						) : (
							<>
								<PenLinear className="size-4" />
								Edit source
							</>
						)}
					</DropdownMenuItem>
					<DropdownMenuItem className="text-destructive">
						<TrashBinLinear color="red" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
};
