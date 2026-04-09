import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import api from "@/lib/api";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/utils/trpc";

import { ActionFormShell } from "./action-form-shell";

type ClickUpWorkspace = {
  id: string;
  name: string;
};

type ClickUpSpace = {
  id: string;
  name: string;
};

type ClickUpList = {
  id: string;
  name: string;
};

type ClickUpFolder = {
  id: string;
  name: string;
  lists?: ClickUpList[];
};

type ClickUpWorkspacesResponse = {
  teams: ClickUpWorkspace[];
};

type ClickUpSpacesResponse = {
  spaces: ClickUpSpace[];
};

type ClickUpFoldersResponse = {
  folders: ClickUpFolder[];
};

type ClickUpListsResponse = {
  lists: ClickUpList[];
};

type ClickUpListOption = {
  id: string;
  name: string;
  folderId: string | null;
  folderName: string | null;
};

type CreateClickUpActionResponse = {
  action: {
    id: string;
  };
};

export function ClickUpActionForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [listId, setListId] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);

  const {
    data: workspacesData,
    isLoading: isLoadingWorkspaces,
    error: workspacesError,
  } = useQuery({
    queryKey: ["clickup", "workspaces"],
    refetchOnMount: true,
    queryFn: async () => {
      const response = await api.get<ClickUpWorkspacesResponse>(
        "/api/integrations/clickup/workspaces",
      );
      return response.data;
    },
  });

  const {
    data: spacesData,
    isLoading: isLoadingSpaces,
    error: spacesError,
  } = useQuery({
    queryKey: ["clickup", "spaces", workspaceId],
    enabled: workspaceId.length > 0,
    queryFn: async () => {
      const response = await api.get<ClickUpSpacesResponse>(
        `/api/integrations/clickup/spaces?workspaceId=${encodeURIComponent(workspaceId)}`,
      );
      return response.data;
    },
  });

  const {
    data: foldersData,
    isLoading: isLoadingFolders,
    error: foldersError,
  } = useQuery({
    queryKey: ["clickup", "folders", spaceId],
    enabled: spaceId.length > 0,
    queryFn: async () => {
      const response = await api.get<ClickUpFoldersResponse>(
        `/api/integrations/clickup/folders?spaceId=${encodeURIComponent(spaceId)}`,
      );
      return response.data;
    },
  });

  const {
    data: listsData,
    isLoading: isLoadingLists,
    error: listsError,
  } = useQuery({
    queryKey: ["clickup", "lists", spaceId],
    enabled: spaceId.length > 0,
    queryFn: async () => {
      const response = await api.get<ClickUpListsResponse>(
        `/api/integrations/clickup/lists?spaceId=${encodeURIComponent(spaceId)}`,
      );
      return response.data;
    },
  });

  useEffect(() => {
    setSpaceId("");
    setListId("");
  }, [workspaceId]);

  useEffect(() => {
    setListId("");
  }, [spaceId]);

  const workspaces = workspacesData?.teams ?? [];
  const spaces = spacesData?.spaces ?? [];
  const folders = foldersData?.folders ?? [];
  const folderlessLists = listsData?.lists ?? [];
  const workspaceItems = workspaces.map((workspace) => ({
    label: workspace.name,
    value: workspace.id,
  }));
  const spaceItems = spaces.map((space) => ({
    label: space.name,
    value: space.id,
  }));

  const listOptions: ClickUpListOption[] = [
    ...folders.flatMap((folder) =>
      (folder.lists ?? []).map((list) => ({
        id: list.id,
        name: list.name,
        folderId: folder.id,
        folderName: folder.name,
      })),
    ),
    ...folderlessLists.map((list) => ({
      id: list.id,
      name: list.name,
      folderId: null,
      folderName: null,
    })),
  ];
  const listItems = listOptions.map((list) => ({
    label: list.folderName ? `${list.folderName} / ${list.name}` : `Direct / ${list.name}`,
    value: list.id,
  }));

  const workspacesMessage =
    (workspacesError as AxiosError<{ message: string }>)?.response?.data?.message ?? null;
  const spacesMessage =
    (spacesError as AxiosError<{ message: string }>)?.response?.data?.message ?? null;
  const foldersMessage =
    (foldersError as AxiosError<{ message: string }>)?.response?.data?.message ?? null;
  const listsMessage =
    (listsError as AxiosError<{ message: string }>)?.response?.data?.message ?? null;

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
  const selectedSpace = spaces.find((space) => space.id === spaceId) ?? null;
  const selectedList = listOptions.find((list) => list.id === listId) ?? null;

  const createActionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<CreateClickUpActionResponse>("/api/actions/clickup", {
        name: name.trim(),
        description: description.trim(),
        enabled,
        config: {
          workspaceId: selectedWorkspace!.id,
          workspaceName: selectedWorkspace!.name,
          spaceId: selectedSpace!.id,
          spaceName: selectedSpace!.name,
          listId: selectedList!.id,
          listName: selectedList!.name,
        },
      });

      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
      toast.success("ClickUp action created");
      navigate({ to: "/actions" });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create ClickUp action");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Action name is required");
      return;
    }

    if (!selectedWorkspace) {
      toast.error("Select a ClickUp workspace");
      return;
    }

    if (!selectedSpace) {
      toast.error("Select a ClickUp space");
      return;
    }

    if (!selectedList) {
      toast.error("Select a ClickUp list");
      return;
    }

    if (!description.trim()) {
      toast.error("When to use is required");
      return;
    }

    createActionMutation.mutate();
  };

  return (
    <ActionFormShell
      title="Create ClickUp tasks"
      enabled={enabled}
      onEnabledChange={setEnabled}
      onSubmit={handleSubmit}
      isSubmitting={createActionMutation.isPending}
      submitLabel="Save action"
    >
      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="name">Action name</Label>
          <small className="text-muted-foreground">
            Give your action a name that clearly describes its purpose.
          </small>
        </div>
        <Input
          id="name"
          placeholder="Enter action name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clickup-workspace">Workspace</Label>
        {workspacesMessage ? (
          <small className="text-red-500">{workspacesMessage}</small>
        ) : (
          <small className="text-muted-foreground">
            Choose one of the workspaces authorized during ClickUp OAuth.
          </small>
        )}
        <Select
          items={workspaceItems}
          value={workspaceId}
          onValueChange={(value) => setWorkspaceId(value ?? "")}
          disabled={isLoadingWorkspaces || workspaces.length === 0}
        >
          <SelectTrigger className="w-full" id="clickup-workspace">
            <SelectValue
              placeholder={isLoadingWorkspaces ? "Loading workspaces..." : "Select workspace"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Workspaces</SelectLabel>
              {workspaceItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clickup-space">Space</Label>
        {spacesMessage ? (
          <small className="text-red-500">{spacesMessage}</small>
        ) : (
          <small className="text-muted-foreground">
            Pick the ClickUp space that contains the destination list.
          </small>
        )}
        <Select
          items={spaceItems}
          value={spaceId}
          onValueChange={(value) => setSpaceId(value ?? "")}
          disabled={!workspaceId || isLoadingSpaces || spaces.length === 0}
        >
          <SelectTrigger className="w-full" id="clickup-space">
            <SelectValue placeholder={isLoadingSpaces ? "Loading spaces..." : "Select space"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Spaces</SelectLabel>
              {spaceItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clickup-list">List</Label>
        {foldersMessage || listsMessage ? (
          <small className="text-red-500">{foldersMessage ?? listsMessage}</small>
        ) : (
          <small className="text-muted-foreground">
            Choose the list where the chatbot should create ClickUp tasks.
          </small>
        )}
        <Select
          items={listItems}
          value={listId}
          onValueChange={(value) => setListId(value ?? "")}
          disabled={!spaceId || (isLoadingFolders && isLoadingLists) || listItems.length === 0}
        >
          <SelectTrigger className="w-full" id="clickup-list">
            <SelectValue
              placeholder={isLoadingFolders || isLoadingLists ? "Loading lists..." : "Select list"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Lists</SelectLabel>
              {listItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="description">When to use</Label>
          <small className="text-muted-foreground">
            Describe when this action should be triggered. The description should provide clear
            guidance on the intended use case for this action.
          </small>
        </div>
        <Textarea
          id="description"
          className="w-full"
          placeholder="Enter a description for when to use this action"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </ActionFormShell>
  );
}
