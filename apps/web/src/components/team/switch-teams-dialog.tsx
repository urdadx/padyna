import { authClient, useSession } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn, sleep } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Spinner from "../ui/spinner";
import { useState } from "react";
import { CheckMarkIcon } from "@/assets/icons/checkmark-icon";

interface SwitchTeamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SwitchTeamsDialog = ({ open, onOpenChange }: SwitchTeamsDialogProps) => {
  const { data: organizations, isPending } = authClient.useListOrganizations();
  const { data: session } = useSession();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitchTeam = async (orgId: string, orgSlug: string) => {
    if (switchingId || session?.session.activeOrganization === orgId) return;

    setSwitchingId(orgId);
    try {
      await authClient.organization.setActive({
        organizationId: orgId,
        organizationSlug: orgSlug,
      });
      await sleep(50);
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch team:", error);
      setSwitchingId(null);
    }
  };

  const isActive = (orgId: string) => {
    return session?.session.activeOrganization === orgId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg p-0 overflow-hidden">
        <div className="px-5 pt-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Switch Teams</DialogTitle>
            <DialogDescription>Select the workspace you want to switch to.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-6 flex flex-col gap-1 smooth-div max-h-[60vh]">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-muted-foreground animate-pulse">Fetching workspaces...</p>
            </div>
          ) : (
            organizations?.map((org) => {
              const active = isActive(org.id);
              const switching = switchingId === org.id;

              return (
                <button
                  key={org.id}
                  disabled={!!switchingId || active}
                  onClick={() => handleSwitchTeam(org.id, org.slug)}
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-md transition-all text-left",
                    "hover:bg-accent hover:text-accent-foreground group",
                    active && "bg-accent/50 cursor-default border-transparent",
                    switching && "opacity-70 grayscale",
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0 rounded-full border shadow-sm">
                      <AvatarImage
                        src={
                          org.logo || `https://api.dicebear.com/9.x/initials/svg?seed=${org.name}`
                        }
                        alt={org.name}
                        className="object-cover"
                      />

                      {!org.logo && (
                        <AvatarFallback className="rounded-full font-bold bg-primary/10 text-primary">
                          {org.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{org.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{org.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-6 h-6 shrink-0">
                    {switching ? (
                      <Spinner className="h-4 w-4" />
                    ) : active ? (
                      <CheckMarkIcon color="green" className="h-6 w-6 text-primary" />
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
