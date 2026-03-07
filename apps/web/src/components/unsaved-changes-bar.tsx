import { Button } from "./ui/button";

export function UnsavedChangesBar({ className = "" }: { className?: string }) {
	return (
		<footer className={`bg-background p-4 ${className}`}>
			<p className="mb-3 text-sm text-muted-foreground">
				You have unsaved changes. Do you wish to save them?
			</p>
			<div className="flex gap-3">
				<Button className="flex-1" variant="outline" type="button">
					Discard
				</Button>
				<Button className="flex-1" type="button">
					Save to agent
				</Button>
			</div>
		</footer>
	);
}
