import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { authClient } from "@/lib/auth-client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { PenLinear } from "@/assets/icons/pen-icon";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { useState } from "react";
import { EditMemberDetails } from "./edit-member-details";
import { RemoveMember } from "./remove-member";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useRouteContext } from "@tanstack/react-router";

export function TeamMembersTable() {
	const { session } = useRouteContext({ from: "/(admin)" });
	const activeOrganizationId = session?.session.activeOrganization;
	const isAdmin = session?.user.role === "admin";

	const [editingMember, setEditingMember] = useState<any>(null);
	const [removingMember, setRemovingMember] = useState<any>(null);

	const { data: members } = useSuspenseQuery({
		queryKey: ["team-members", activeOrganizationId],
		queryFn: async () => {
			if (!activeOrganizationId) return [];
			const { data } = await authClient.organization.listMembers({
				query: {
					organizationId: activeOrganizationId,
				},
			});
			return data?.members || [];
		},
	});

	return (
		<div className="max-w-xs md:max-w-full">
			<Table className=" ">
				<TableHeader className="w-full text-muted-foreground ">
					<TableRow className="hover:bg-transparent text-muted-foreground text-xs">
						<TableHead>Name</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{(members || []).map((member) => (
						<TableRow className="w-full" key={member.id}>
							<TableCell>
								<div className="flex items-center gap-3">
									<div>
										<div className="font-medium">
											{member.user.name}
										</div>
										<span className="mt-0.5 text-muted-foreground text-xs">
											Joined on{" "}
											{new Date(
												member.createdAt,
											).toLocaleDateString()}
										</span>
									</div>
								</div>
							</TableCell>
							<TableCell>{member.user.email}</TableCell>
							<TableCell>{member.role}</TableCell>
							<TableCell>
								<Popover>
									<PopoverTrigger>
										{!isAdmin ? (
											<Tooltip>
												<TooltipTrigger>
													<Button
														disabled={
															!isAdmin
														}
														variant="outline"
														size="sm">
														<MoreHorizontal className="size-4" />
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														Only admins can
														edit or remove
														members.
													</p>
												</TooltipContent>
											</Tooltip>
										) : (
											<Button
												disabled={!isAdmin}
												variant="outline"
												size="sm">
												<MoreHorizontal className="size-4" />
											</Button>
										)}
									</PopoverTrigger>
									<PopoverContent
										align="end"
										className="w-40 p-1">
										<div className="flex flex-col gap-1">
											<Button
												variant="ghost"
												size="sm"
												disabled={!isAdmin}
												onClick={() =>
													setEditingMember(
														member,
													)
												}
												className="justify-start h-8 px-2">
												<PenLinear className="mr-2 h-3.5 w-3.5" />
												Change role
											</Button>

											<Button
												variant="ghost"
												size="sm"
												disabled={!isAdmin}
												onClick={() =>
													setRemovingMember(
														member,
													)
												}
												className="justify-start h-8 px-2 text-red-600 hover:text-red-600 hover:bg-red-50">
												<TrashBinLinear
													className="mr-2 h-3.5 w-3.5"
													color="currentColor"
												/>
												Remove
											</Button>
										</div>
									</PopoverContent>
								</Popover>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<EditMemberDetails
				isDialogOpen={!!editingMember}
				setIsDialogOpen={(open) => !open && setEditingMember(null)}
				member={editingMember}
			/>

			<RemoveMember
				isOpen={!!removingMember}
				onOpenChange={(open) => !open && setRemovingMember(null)}
				member={removingMember}
			/>
		</div>
	);
}
