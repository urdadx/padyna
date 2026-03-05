import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";

export default function InputSelect() {
	const id = useId();
	return (
		<div className="*:not-first:mt-2">
			<Label htmlFor={id}>Your website URL</Label>
			<div className="flex rounded-md shadow-xs">
				<SelectNative className="w-fit rounded-e-none text-muted-foreground shadow-none hover:text-foreground">
					<option value="https://">https://</option>
					<option value="http://">http://</option>
				</SelectNative>
				<Input
					className="-ms-px rounded-s-none shadow-none focus-visible:z-10"
					id={id}
					placeholder="your-website.com"
					type="text"
				/>
			</div>
		</div>
	);
}
