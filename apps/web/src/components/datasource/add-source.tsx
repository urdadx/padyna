import { PlusIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { FileLinear } from "@/assets/icons/file-icon";
import { TextLinear } from "@/assets/icons/text-icon";
import { FileUploadDialog } from "../onboarding/file-upload-dialog";
import { QASourceDialog } from "../onboarding/qa-source-dialog";
import { TextSourceDialog } from "../onboarding/text-source-dialog";
import { GlobeLinear } from "@/assets/icons/globe-icon";
import { ChatLinear } from "@/assets/icons/chat-icon";
import { WebSourceDialog } from "../onboarding/web-source-dialog";
import { NotionIcon } from "@/assets/icons/notion-icon";
import { GoogleDrive } from "@/assets/icons/google-drive-icon";
import { NotionSourceDialog } from "../onboarding/notion-source-dialog";
import { GoogleDriveSourceDialog } from "../onboarding/google-drive-source-dialog";
import { useReducer } from "react";

type AddSourceState = {
  isAddSourceMenuOpen: boolean;
  isFileModalOpen: boolean;
  isGoogleDriveModalOpen: boolean;
  isLinkModalOpen: boolean;
  isNotionModalOpen: boolean;
  isQAModalOpen: boolean;
  isTextModalOpen: boolean;
};

function addSourceReducer(state: AddSourceState, action: Partial<AddSourceState>) {
  return { ...state, ...action };
}

export const AddSource = () => {
  const [state, updateState] = useReducer(addSourceReducer, {
    isAddSourceMenuOpen: false,
    isFileModalOpen: false,
    isGoogleDriveModalOpen: false,
    isLinkModalOpen: false,
    isNotionModalOpen: false,
    isQAModalOpen: false,
    isTextModalOpen: false,
  });
  const {
    isAddSourceMenuOpen,
    isFileModalOpen,
    isGoogleDriveModalOpen,
    isLinkModalOpen,
    isNotionModalOpen,
    isQAModalOpen,
    isTextModalOpen,
  } = state;

  return (
    <>
      <DropdownMenu open={isAddSourceMenuOpen} onOpenChange={(open) => updateState({ isAddSourceMenuOpen: open })}>
        <DropdownMenuTrigger>
          <Button className="h-9 text-white w-full sm:w-auto">
            <PlusIcon className="h-4 w-4 text-white" />
            Add Data Source
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => updateState({ isFileModalOpen: true })}>
            <FileLinear />
            <span>Files</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateState({ isLinkModalOpen: true })}>
            <GlobeLinear />
            <span>Links</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              updateState({ isAddSourceMenuOpen: false, isGoogleDriveModalOpen: true });
            }}
          >
            <GoogleDrive />
            <span>Google Drive</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              updateState({ isAddSourceMenuOpen: false, isNotionModalOpen: true });
            }}
          >
            <NotionIcon />
            <span>Notion</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateState({ isQAModalOpen: true })}>
            <ChatLinear />
            <span>Q&A</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateState({ isTextModalOpen: true })}>
            <TextLinear />
            <span>Text snippets</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FileUploadDialog
        open={isFileModalOpen}
        onOpenChange={(open) => updateState({ isFileModalOpen: open })}
        onUpload={(files) => {
          console.log("Uploaded files:", files);
        }}
      />
      <WebSourceDialog open={isLinkModalOpen} onOpenChange={(open) => updateState({ isLinkModalOpen: open })} />
      <NotionSourceDialog open={isNotionModalOpen} onOpenChange={(open) => updateState({ isNotionModalOpen: open })} />
      <GoogleDriveSourceDialog
        open={isGoogleDriveModalOpen}
        onOpenChange={(open) => updateState({ isGoogleDriveModalOpen: open })}
      />
      <QASourceDialog open={isQAModalOpen} onOpenChange={(open) => updateState({ isQAModalOpen: open })} />
      <TextSourceDialog open={isTextModalOpen} onOpenChange={(open) => updateState({ isTextModalOpen: open })} />
    </>
  );
};
