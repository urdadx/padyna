import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InputWithStartAddonProps {
	value?: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function InputWithStartAddon({ value, onChange }: InputWithStartAddonProps) {
	const id = useId();
	return (
		<div className="*:not-first:mt-2">
			<Label htmlFor={id}>Your website URL</Label>
			<div className="flex rounded-md ">
				<span className=" inline-flex items-center rounded-s-md border border-input bg-white px-3 text-muted-foreground text-sm">
					https://
				</span>
				<Input
					className="-ms-px rounded-s-none shadow-none"
					id={id}
					placeholder="google.com"
					type="text"
					aria-required="true"
					required
					value={value}
					onChange={onChange}
				/>
			</div>
		</div>
	);
}
