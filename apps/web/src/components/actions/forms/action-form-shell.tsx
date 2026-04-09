import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Spinner from "@/components/ui/spinner";

type ActionFormShellProps = {
	title: string;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	isSubmitting?: boolean;
	submitLabel?: string;
	children: ReactNode;
};

export function ActionFormShell({
	title,
	enabled,
	onEnabledChange,
	onSubmit,
	isSubmitting = false,
	submitLabel = "Save and continue",
	children,
}: ActionFormShellProps) {
	return (
		<div className="container mx-auto max-w-3xl p-4">
			<Link to="/actions">
				<Button size="sm" variant="outline" className="mb-2">
					<ArrowLeft />
					Back
				</Button>
			</Link>
			<div className="flex justify-between items-center mt-2 mb-6">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				<Tooltip>
					<TooltipTrigger>
						<Switch
							id="enabled"
							checked={enabled}
							onCheckedChange={onEnabledChange}
						/>
					</TooltipTrigger>
					<TooltipContent>
						<p>Disable this action</p>
					</TooltipContent>
				</Tooltip>
			</div>
			<form onSubmit={onSubmit} className="space-y-6 sm:space-y-7">
				{children}
				<div className="flex justify-end">
					<Button type="submit" variant="default" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Spinner className="text-white" />
								Saving...
							</>
						) : (
							submitLabel
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
