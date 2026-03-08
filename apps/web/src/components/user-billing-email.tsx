import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";

export function UserBillingEmail() {
	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-6">
				<h3 className="text-xl font-semibold text-foreground">Billing email</h3>
				<div className="space-y-0 relative">
					<div className="flex flex-col gap-4 pt-1">
						<div className="text-sm flex items-center gap-2 text-muted-foreground">
							<span>
								Email address where you receive billing
								notifications.
							</span>
						</div>
						<Input
							disabled
							type="email"
							className="w-100 h-8 bg-gray-200 outline-2"
							defaultValue="jackmaaye@gmail.com"
						/>
					</div>
				</div>
			</div>
			<div className="p-3 bg-gray-50 border-t border-border rounded-b-2xl">
				<Button size="sm">Save changes</Button>
			</div>
		</div>
	);
}
