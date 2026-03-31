import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { useRouteContext } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface EditMemberDetailsProps {
	isDialogOpen: boolean;
	setIsDialogOpen: (value: boolean) => void;
	member: any;
}

const ROLES = [
	{
		id: "admin",
		name: "Admin",
		description: "Full access to all team settings and member management.",
	},
	{
		id: "member",
		name: "Member",
		description: "Standard access to team resources.",
	},
];

export const EditMemberDetails = ({
	isDialogOpen,
	setIsDialogOpen,
	member,
}: EditMemberDetailsProps) => {
	const [role, setRole] = useState("");
	const { session } = useRouteContext({ from: "/(admin)" });
	const queryClient = useQueryClient();
	const organizationId = session?.session.activeOrganization || undefined;

	useEffect(() => {
		if (member) {
			setRole(member.role || "member");
		}
	}, [member]);

	const { mutate: updateMemberRole, isPending } = useMutation({
		mutationFn: async () => {
			if (!member?.userId || !organizationId) return;
			await authClient.organization.updateMemberRole({
				role: role as "admin" | "member",
				memberId: member.id,
				organizationId: organizationId,
			});
			await trpcClient.auth.updateUserRole.mutate({
				userId: member.userId,
				role: role as "admin" | "member",
			});
		},
		onSuccess: async () => {
			toast.success("Changes saved");
			await queryClient.invalidateQueries(trpc.auth.getSession.queryOptions());
			queryClient.invalidateQueries({
				queryKey: ["team-members", organizationId],
			});
			setIsDialogOpen(false);
		},
		onError: (error: any) => {
			console.error(error);
			toast.warning(error.message || "Failed to save changes. Please try again");
		},
	});

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		updateMemberRole();
	};

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogContent className="w-full sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Change role for member
					</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground">
						Select an option below to assign a new role for this user
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSave} className="grid gap-6">
					<div className="flex flex-col gap-4">
						<Label className="text-muted-foreground font-medium">
							Select Role
						</Label>
						<RadioGroup
							value={role}
							onValueChange={setRole}
							className="gap-4">
							{ROLES.map((r) => (
								<label
									key={r.id}
									className="flex cursor-pointer items-start gap-3 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">
									<RadioGroupItem
										value={r.id}
										id={r.id}
										className="mt-1"
									/>
									<div className="grid gap-1">
										<span className="font-medium text-sm">
											{r.name}
										</span>
										<span className="text-sm text-muted-foreground leading-normal">
											{r.description}
										</span>
									</div>
								</label>
							))}
						</RadioGroup>
					</div>
					<DialogFooter>
						<DialogClose>
							<Button variant="outline" type="button">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
