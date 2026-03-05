import { useId } from "react";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function UseCaseSelect() {
	const id = useId();
	return (
		<div className="*:not-first:mt-2">
			<Label htmlFor={id}>Use case</Label>
			<Select defaultValue="Customer Success">
				<SelectTrigger className="w-full" id={id}>
					<SelectValue placeholder="Select use case" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="Customer Success">Customer Success</SelectItem>
					<SelectItem value="Sales Representative">
						Sales Representative
					</SelectItem>
					<SelectItem value="Technical Support">Technical Support</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
