import { authClient, useSession } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn, sleep } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Spinner from "../ui/spinner";

interface SwitchTeamsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const SwitchTeamsDialog = ({ open, onOpenChange }: SwitchTeamsDialogProps) => {
	const { data: organizations, isPending } = authClient.useListOrganizations();
	const { data: session } = useSession();

	const handleSwitchTeam = async (orgId: string, orgSlug: string) => {
		await authClient.organization.setActive({
			organizationId: orgId,
			organizationSlug: orgSlug,
		});
		await sleep(1);
		window.location.reload();
	};

	const isActive = (orgId: string) => {
		return session?.session.activeOrganization === orgId;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-full sm:max-w-lg ">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Switch Teams
					</DialogTitle>
					<DialogDescription>
						Switch to a different team to access its agents and settings.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-3 smooth-div max-h-[80vh]">
					{isPending ? (
						<div className="flex justify-center flex-col gap-2">
							<Spinner />
							<span className="text-sm text-muted-foreground">
								Loading teams...
							</span>
						</div>
					) : (
						organizations?.map((org) => (
							<div
								onClick={() => handleSwitchTeam(org.id, org.slug)}
								key={org.id}
								className={cn(
									"flex items-center justify-between rounded-md border p-2 hover:bg-muted cursor-pointer",
									isActive(org.id) &&
										"bg-gray-200 border-2 border-primary",
								)}>
								<div className="flex items-center gap-3">
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage
											src={
												org.logo ||
												`https://api.dicebear.com/9.x/glass/svg?seed=${org.id}`
											}
											alt={org.name}
											className="rounded-lg w-full h-full"
										/>
										<AvatarFallback className="rounded-lg">
											{org.name.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="grid text-sm">
										<span className="font-medium">
											{org.name}
										</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
