import { Button } from "@/components/ui/button";

export function DeleteAccount() {
	return (
		<div className="rounded-2xl border border-red-300 bg-card text-card-foreground">
			<div className="p-3 px-6">
				<h3 className="text-xl font-semibold text-foreground">Delete Account</h3>
				<div className="space-y-0 relative">
					<div className="flex flex-col gap-4 py-4">
						<div className="text-sm flex items-center gap-2 text-muted-foreground">
							<span>
								Deleting your account is irreversible. This will
								permanently delete all your data, including your
								agents, conversations, and settings.
							</span>
						</div>
					</div>
				</div>
			</div>
			<div className="p-3 bg-red-50 border-t border-red-300 rounded-b-2xl">
				<Button className="bg-red-500 text-white hover:bg-red-600" size="sm">
					Yes, delete
				</Button>
			</div>
		</div>
	);
}
