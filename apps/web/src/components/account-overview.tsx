import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { UploadLinear } from "@/assets/icons/upload-icon";

export function AccountOverview() {
  return (
    <div className="rounded-2xl border bg-card text-card-foreground">
      <div className="p-3 px-4 sm:px-6">
        <h3 className="text-xl font-semibold text-foreground">Overview</h3>
        <div className="space-y-0 relative">
          <div className="flex flex-col gap-2 py-2">
            <Label className="text-sm text-muted-foreground">Avatar</Label>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Avatar className="h-16 w-16 rounded-2xl">
                <AvatarImage className="rounded-2xl object-cover" src={""} />
                <AvatarFallback className="rounded-2xl bg-muted text-muted-foreground">
                  {"P"}
                </AvatarFallback>
              </Avatar>

              <Button className="font-normal text-gray-800" variant="outline" size="sm">
                <UploadLinear className="mr-1 h-4 w-4" />
                Change avatar
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 py-4">
            <Label className="text-sm text-muted-foreground">Username</Label>
            <Input
              type="text"
              className="h-8 w-full bg-gray-200 outline-2"
              defaultValue="Jack Maaye"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-gray-50 p-3 px-4 sm:px-6 rounded-b-2xl">
        <Button size="sm">Save </Button>
      </div>
    </div>
  );
}
