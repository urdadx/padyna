import { ColorPickerDialog } from "./color-picker-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { TrashBinLinear } from "@/assets/icons/trash-icon";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { InfoIcon, MoreHorizontal, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { UploadLinear } from "@/assets/icons/upload-icon";
import { Switch } from "./ui/switch";

export function AgentSettingsPanel() {
  const [_primaryColor, setPrimaryColor] = useState("#000000");

  return (
    <div className="flex h-full min-h-0 flex-col gap-6  bg-background pr-1">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl  font-semibold tracking-tight">Playground</h1>
        <Switch defaultChecked id="enable-widget" />
      </div>
      <div className="flex flex-col gap-6 pb-6">
        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground font-medium">Agent name</Label>
          <Input placeholder="Padyna Agent" className="" />
        </div>

        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground font-medium">Agent icon</Label>
          <div className="flex  items-center justify-between">
            <Avatar className="w-12 h-12 rounded-md">
              <AvatarImage className="rounded-md" src={""} />
              <AvatarFallback className="bg-muted rounded-md text-muted-foreground">
                {"P"}
              </AvatarFallback>
            </Avatar>
            <Popover>
              <PopoverTrigger>
                <Button variant="outline" size="icon" className="rounded-lg">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                <div className="flex flex-col">
                  <Button variant="ghost" size="sm" className="justify-start gap-2 font-normal">
                    <UploadLinear color="black" className="w-4 h-4" />
                    Upload new icon
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-2 font-normal text-destructive hover:text-destructive"
                  >
                    <TrashBinLinear color="red" className="w-4 h-4 " />
                    Delete
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground font-medium">Use case</Label>
          <Select defaultValue="Customer Support">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select use case" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Customer Support">Customer Support</SelectItem>
              <SelectItem value="Technical Copilot">Technical Copilot</SelectItem>
              <SelectItem value="Sales Representative">Sales Representative</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground font-medium">Primary color</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <ColorPickerDialog onColorSelect={setPrimaryColor} isUpdating={false} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground font-medium">Welcome message</Label>
          <Input value="Hi👋, What can I help you with?" className="" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground font-medium">Suggested messages</Label>
          <Button variant="outline">
            <Plus size={12} />
            Add suggested message
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-muted-foreground font-medium">
            Allowed domains <InfoIcon className="size-4 text-muted-foreground" />
          </Label>
          <Button variant="outline">
            <Plus size={12} />
            Add allowed domain
          </Button>{" "}
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground font-medium">Hide "Powered by Padyna" text</Label>
          <div className="flex items-center gap-2">
            <Switch defaultChecked id="hide-powered-by" />
          </div>
        </div>
      </div>
    </div>
  );
}
