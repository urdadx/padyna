import { useState, useEffect } from "react";
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

interface EditMemberDetailsProps {
	isDialogOpen: boolean;
	setIsDialogOpen: (value: boolean) => void;
	member: any;
}

export const EditMemberDetails = ({
	isDialogOpen,
	setIsDialogOpen,
	member,
}: EditMemberDetailsProps) => {
	const [name, setName] = useState("");
	const [role, setRole] = useState("");

	useEffect(() => {
		if (member) {
			setName(member.user.name || "");
			setRole(member.role || "Member");
		}
	}, [member]);

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogContent className="w-full sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Edit team member details
					</DialogTitle>
					<p className="text-sm text-muted-foreground">
						Update the details for {member?.user.email}.
					</p>
				</DialogHeader>
				<div className="grid gap-3">
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Name
						</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter team member's name"
							className=""
						/>
					</div>
					<div className="flex flex-col gap-3">
						<Label className="text-muted-foreground font-medium">
							Role
						</Label>
						<Select
							value={role}
							onValueChange={(value) => setRole(value || "")}>
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
					<Button onClick={() => setIsDialogOpen(false)}>Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
