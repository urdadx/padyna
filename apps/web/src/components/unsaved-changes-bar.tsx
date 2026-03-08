import { Button } from "./ui/button";

export function UnsavedChangesBar({ className = "" }: { className?: string }) {
	return (
		<footer className={`bg-transparent backdrop-blur-md p-3 ${className}`}>
			<div className="flex gap-3">
				<Button size="sm" className="flex-1" variant="outline" type="button">
					Discard
				</Button>
				<Button size="sm" className="flex-1" type="button">
					Save changes
				</Button>
			</div>
		</footer>
	);
}
