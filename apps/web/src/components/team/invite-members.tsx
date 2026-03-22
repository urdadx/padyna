import { useState } from "react";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface InviteMembersProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (value: boolean) => void;
}

type Role = "admin" | "member" | "owner";

const ROLES = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all organization settings and member management.",
  },
  {
    id: "member",
    name: "Member",
    description: "Standard access to organization resources.",
  },
];

export const InviteMembers = ({ isDialogOpen, setIsDialogOpen }: InviteMembersProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const organizationId = session?.session?.activeOrganization || undefined;

  const { mutate: inviteMember, isPending } = useMutation({
    mutationFn: async () => {
      if (!email || !organizationId) {
        throw new Error("Email and Organization ID are required");
      }
      const { error } = await authClient.organization.inviteMember({
        email: email,
        role: role,
        organizationId: organizationId,
      });

      if (error) {
        throw new Error(error.message || "Failed to invite member");
      }
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      queryClient.invalidateQueries({
        queryKey: ["organization-members", organizationId],
      });
      setIsDialogOpen(false);
      setEmail("");
      setRole("member");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || "Failed to invite member. Please try again");
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember();
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Invite a new team member</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter the details below to invite a new team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="grid gap-6">
          <div className="flex flex-col gap-3">
            <Label className="text-muted-foreground font-medium">Email address</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter team member's email"
              type="email"
              required
            />
          </div>
          <div className="flex flex-col gap-4">
            <Label className="text-muted-foreground font-medium">Role</Label>
            <RadioGroup value={role} onValueChange={setRole} className="gap-4">
              {ROLES.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-start gap-3 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value={r.id} id={r.id} className="mt-1" />
                  <div className="grid gap-1">
                    <span className="font-medium text-sm">{r.name}</span>
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
              {isPending ? "Sending..." : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
