import { RocketLinear } from "@/assets/icons/rocket";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";
import { LetterLinear } from "@/assets/icons/letter";
import { useState } from "react";
import { InviteMembers } from "./team/invite-members";

export const Navbar = () => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  return (
    <>
      <InviteMembers isDialogOpen={isInviteDialogOpen} setIsDialogOpen={setIsInviteDialogOpen} />
      <header className="px-4 sticky top-0 flex justify-between h-14 shrink-0 items-center  bg-background/50 backdrop-blur-lg border-b transition-[width,height] ease-linear z-10 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center">
          <SidebarTrigger className=" w-7 h-7 text-muted-foreground " />
        </div>
        <div className="flex gap-1 sm:gap-2  items-center ml-auto">
          <Button className="text-primary font-normal hover:text-primary" variant="outline">
            <RocketLinear color="#8b5cf6" className="size-4" />
            <span className="flex sm:hidden">Deploy</span>
            <span className="hidden sm:flex">Deploy your agent</span>
          </Button>
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <LetterLinear color="white" className="size-4" />
            <span className="flex sm:hidden">Invite team</span>
            <span className="hidden sm:flex">Invite your team</span>
          </Button>
        </div>
      </header>
    </>
  );
};
