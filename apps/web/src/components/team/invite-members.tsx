import { useState } from "react";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface InviteMembersProps {
	isDialogOpen: boolean;
	setIsDialogOpen: (value: boolean) => void;
}

export const InviteMembers = ({ isDialogOpen, setIsDialogOpen }: InviteMembersProps) => {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("");

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogContent className="w-full sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Invite a new team member
					</DialogTitle>
					<p className="text-sm text-muted-foreground">
						Enter the details below to invite a new team member.
					</p>
				</DialogHeader>
				<div className="grid gap-3">
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Name
						</Label>
						<Input
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Enter team member's email"
							className=""
						/>
					</div>
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Role
						</Label>
						<Select
							value={role}
							onValueChange={(value) => setRole(value || "")}
							defaultValue="Member">
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Admin">Admin</SelectItem>
								<SelectItem value="Member">Member</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<DialogClose>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button onClick={() => setIsDialogOpen(false)}>Add member</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
