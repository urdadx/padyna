import { Button } from "./ui/button";

export function UnsavedChangesBar({ className = "" }: { className?: string }) {
	return (
		<footer className={`bg-transparent backdrop-blur-md p-4 ${className}`}>
			<div className="flex gap-3">
				<Button className="flex-1" variant="outline" type="button">
					Discard
				</Button>
				<Button className="flex-1" type="button">
					Save changes
				</Button>
			</div>
		</footer>
	);
}
