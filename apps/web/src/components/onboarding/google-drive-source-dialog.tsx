import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SearchLinear } from "@/assets/icons/search-icon";
import { FileTree } from "@/components/filetree";
import GoogleDrive from "@/assets/google-drive.png";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/spinner";
import api from "@/lib/api";
import { trpc } from "@/utils/trpc";

type GoogleDriveResource = {
	id: string;
	object: "file" | "folder";
	name: string;
	mimeType: string;
	modifiedTime: string | null;
	url: string | null;
	size: number | null;
	parents: string[];
};

type GoogleDriveListResponse = {
	results: GoogleDriveResource[];
	nextPageToken: string | null;
	hasMore: boolean;
};

type GoogleDriveStatusResponse = {
	connected: boolean;
	chatbotId?: string;
	integration?: {
		accountId: string | null;
		accountEmail: string | null;
		accountName: string | null;
	} | null;
};

type GoogleDriveIngestResponse = {
	results: Array<{
		fileId: string;
		fileName: string;
		status: "synced" | "failed";
		message?: string;
	}>;
};

interface GoogleDriveSourceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function getErrorMessage(error: unknown, fallback: string) {
	if (typeof error === "object" && error && "response" in error) {
		const response = (error as { response?: { data?: { message?: string } } }).response;
		return response?.data?.message || fallback;
	}

	return error instanceof Error ? error.message : fallback;
}

async function fetchGoogleDriveStatus() {
	const response = await api.get<GoogleDriveStatusResponse>(
		"/api/integrations/google-drive/status",
	);
	return response.data;
}

async function fetchGoogleDriveFiles(args: { folderId?: string; query?: string }) {
	const response = await api.get<GoogleDriveListResponse>(
		"/api/integrations/google-drive/files",
		{
			params: {
				folderId: args.folderId,
				query: args.query || undefined,
			},
		},
	);
	return response.data;
}

export function GoogleDriveSourceDialog({ open, onOpenChange }: GoogleDriveSourceDialogProps) {
	const [submittedQuery, setSubmittedQuery] = useState("");
	const [openedFolderIds, setOpenedFolderIds] = useState<Set<string>>(() => new Set());
	const [selectedItems, setSelectedItems] = useState<Record<string, GoogleDriveResource>>({});
	const [isConnectingGoogleDrive, setIsConnectingGoogleDrive] = useState(false);
	const popupRef = useRef<Window | null>(null);
	const pollTimerRef = useRef<number | null>(null);
	const queryClient = useQueryClient();

	const clearPollTimer = () => {
		if (pollTimerRef.current) {
			window.clearInterval(pollTimerRef.current);
			pollTimerRef.current = null;
		}
	};

	const statusQuery = useQuery({
		enabled: open,
		queryFn: fetchGoogleDriveStatus,
		queryKey: ["google-drive", "status"],
		retry: false,
	});

	const isConnected = Boolean(statusQuery.data?.connected);
	const chatbotId = statusQuery.data?.chatbotId ?? null;
	const accountId = statusQuery.data?.integration?.accountId ?? null;
	const accountLabel =
		statusQuery.data?.integration?.accountEmail ??
		statusQuery.data?.integration?.accountName ??
		"Google Drive";
	const listEnabled = open && isConnected && Boolean(chatbotId);

	const rootFilesQuery = useQuery({
		enabled: listEnabled,
		queryFn: () =>
			fetchGoogleDriveFiles({
				folderId: submittedQuery ? undefined : "root",
				query: submittedQuery,
			}),
		queryKey: ["google-drive", "files", chatbotId, accountId, "root", submittedQuery],
		retry: false,
	});

	const rootItems = rootFilesQuery.data?.results ?? [];
	const openedFolderIdList = useMemo(() => [...openedFolderIds], [openedFolderIds]);

	const folderQueries = useQueries({
		queries: openedFolderIdList.map((folderId) => ({
			enabled: listEnabled && !submittedQuery,
			queryFn: () => fetchGoogleDriveFiles({ folderId }),
			queryKey: ["google-drive", "files", chatbotId, accountId, folderId],
			retry: false,
		})),
	});

	const form = useForm({
		defaultValues: { query: "" },
		onSubmit: ({ value }) => {
			const nextQuery = value.query.trim();
			if (nextQuery === submittedQuery) {
				void rootFilesQuery.refetch();
				return;
			}
			setSubmittedQuery(nextQuery);
		},
	});
	const query = useStore(form.store, (state) => state.values.query);

	const selectedItemList = Object.values(selectedItems);
	const isLoadingStatus = statusQuery.isPending && open;
	const isLoadingFiles = rootFilesQuery.isFetching;
	const loadingFolderItemIds = openedFolderIdList
		.filter((_, index) => folderQueries[index]?.isFetching)
		.map((folderId) => `item:${folderId}`);
	const statusError = statusQuery.error
		? getErrorMessage(statusQuery.error, "Failed to check Google Drive connection")
		: null;
	const listError = rootFilesQuery.error
		? getErrorMessage(rootFilesQuery.error, "Failed to list Google Drive files")
		: null;

	const folderQueryById = useMemo(() => {
		return Object.fromEntries(
			openedFolderIdList.map((folderId, index) => [folderId, folderQueries[index]]),
		);
	}, [folderQueries, openedFolderIdList]);

	const treeData = useMemo(() => {
		const items: Record<
			string,
			{
				name: string;
				children?: string[];
				type?: "folder" | "file";
				description?: string | null;
				selectable?: boolean;
			}
		> = {
			root: { children: [], name: accountLabel, type: "folder" },
		};
		const itemByTreeId: Record<string, GoogleDriveResource> = {};
		const rootChildren: string[] = [];

		const addItem = (item: GoogleDriveResource, parentTreeId?: string) => {
			const treeId = parentTreeId
				? `${parentTreeId}:item:${item.id}`
				: `item:${item.id}`;
			const isFolder = item.object === "folder";
			const folderQuery = folderQueryById[item.id];
			const children = folderQuery?.data?.results ?? [];

			items[treeId] = {
				children: isFolder
					? children.map((child) => `${treeId}:item:${child.id}`)
					: undefined,
				description: isFolder
					? folderQuery?.isFetching
						? "Loading files..."
						: folderQuery?.data
							? `${children.length} item${children.length === 1 ? "" : "s"}`
							: "Select or open folder"
					: item.modifiedTime
						? `Modified ${new Date(item.modifiedTime).toLocaleDateString()}`
						: undefined,
				name: item.name,
				selectable: isFolder,
				type: isFolder ? "folder" : "file",
			};
			itemByTreeId[treeId] = item;

			for (const child of children) {
				addItem(child, treeId);
			}

			return treeId;
		};

		for (const item of rootItems) {
			rootChildren.push(addItem(item));
		}

		items.root.children = rootChildren;
		return { items, itemByTreeId };
	}, [accountLabel, folderQueryById, rootItems]);

	const checkedTreeItems = useMemo(() => {
		return Object.entries(treeData.itemByTreeId)
			.filter(([, item]) => Boolean(selectedItems[item.id]))
			.map(([treeId]) => treeId);
	}, [selectedItems, treeData.itemByTreeId]);

	useEffect(() => {
		if (!open) {
			return;
		}
		setSelectedItems({});
		setOpenedFolderIds(new Set());
	}, [open, submittedQuery, accountId]);

	useEffect(() => {
		return () => {
			clearPollTimer();
			if (popupRef.current && !popupRef.current.closed) {
				popupRef.current.close();
			}
		};
	}, []);

	useEffect(() => {
		if (!open || !listEnabled) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			const nextQuery = query.trim();
			if (nextQuery !== submittedQuery) {
				setSubmittedQuery(nextQuery);
			}
		}, 350);

		return () => window.clearTimeout(timeoutId);
	}, [listEnabled, open, query, submittedQuery]);

	const { mutate: ingestItems, isPending: isIngesting } = useMutation({
		mutationFn: async (payload: GoogleDriveResource[]) => {
			const response = await api.post<GoogleDriveIngestResponse>(
				"/api/integrations/google-drive/ingest",
				{
					items: payload.map((item) => ({ id: item.id, type: item.object })),
				},
			);
			return response.data;
		},
		onError: (error) =>
			toast.error(getErrorMessage(error, "Failed to ingest Google Drive files")),
		onSuccess: (data) => {
			const synced = data.results.filter((result) => result.status === "synced").length;
			const failed = data.results.length - synced;

			if (synced > 0) {
				toast.success(
					`${synced} Google Drive file${synced === 1 ? "" : "s"} ingested.`,
				);
			}
			if (failed > 0) {
				toast.warning(
					`${failed} Google Drive file${failed === 1 ? "" : "s"} failed.`,
				);
			}

			setSelectedItems({});
			onOpenChange(false);
			queryClient.invalidateQueries({
				queryKey: trpc.datasource.getAll.queryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: trpc.datasource.getSourceCounts.queryOptions().queryKey,
			});
		},
	});

	const handleTreeSelectionChange = (checkedTreeItemIds: string[]) => {
		const next: Record<string, GoogleDriveResource> = {};
		for (const treeItemId of checkedTreeItemIds) {
			const item = treeData.itemByTreeId[treeItemId];
			if (item) {
				next[item.id] = item;
			}
		}
		setSelectedItems(next);
	};

	const handleTreeFolderClick = (treeItemId: string) => {
		const item = treeData.itemByTreeId[treeItemId];
		if (!item || item.object !== "folder") {
			return;
		}
		setOpenedFolderIds((current) => {
			if (current.has(item.id)) {
				return current;
			}
			const next = new Set(current);
			next.add(item.id);
			return next;
		});
	};

	const handleGoogleDriveConnect = async () => {
		setIsConnectingGoogleDrive(true);
		try {
			const response = await api.get<{ authorizeUrl: string }>(
				"/api/integrations/google-drive/connect",
			);
			const authorizeUrl = response.data.authorizeUrl;
			if (!authorizeUrl) {
				toast.error("Missing Google Drive authorization URL");
				setIsConnectingGoogleDrive(false);
				return;
			}

			const popup = window.open(
				authorizeUrl,
				"google-drive-oauth",
				"width=600,height=760,left=200,top=100",
			);
			if (!popup) {
				toast.error("Popup blocked. Please allow popups and try again.");
				setIsConnectingGoogleDrive(false);
				return;
			}

			popupRef.current = popup;
			clearPollTimer();
			pollTimerRef.current = window.setInterval(async () => {
				if (!popupRef.current || popupRef.current.closed) {
					clearPollTimer();
					await statusQuery.refetch();
					setIsConnectingGoogleDrive(false);
					return;
				}

				const statusResponse = await statusQuery.refetch();
				if (statusResponse.data?.connected) {
					popupRef.current.close();
					clearPollTimer();
					setIsConnectingGoogleDrive(false);
					toast.success("Google Drive connected");
				}
			}, 1000);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to start Google Drive OAuth flow"));
			setIsConnectingGoogleDrive(false);
		}
	};

	const isCompactDialog = !isLoadingStatus && (!isConnected || Boolean(statusError));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={
					isCompactDialog
						? "flex w-full sm:max-w-xl! flex-col overflow-hidden"
						: "flex h-[75vh] w-full sm:max-w-xl! flex-col overflow-hidden"
				}>
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Add Google Drive Files
					</DialogTitle>
					<DialogDescription>
						Select folders or supported files with relevant knowledge base
						content
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-hidden">
					{isLoadingStatus ? (
						<div className="flex h-full items-center justify-center p-3 text-base text-muted-foreground">
							<Spinner size={30} />
						</div>
					) : statusError ? (
						<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
							{statusError}
						</div>
					) : !isConnected ? (
						<div className="rounded-lg border bg-muted/20 p-4">
							<div className="flex items-start gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
									<img
										src={GoogleDrive}
										alt="Google Drive"
										className="size-6"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="font-medium font-sans text-foreground">
										Connect Google Drive
									</h3>
									<p className="mt-1 text-muted-foreground text-sm">
										Authorize your Google account, then
										choose folders or files to ingest.
									</p>
								</div>
								<Button
									variant="outline"
									disabled={isConnectingGoogleDrive}
									onClick={handleGoogleDriveConnect}>
									{isConnectingGoogleDrive ? (
										<Spinner />
									) : (
										"Connect"
									)}
								</Button>
							</div>
						</div>
					) : (
						<div className="flex h-full min-w-0 flex-col gap-4">
							<form
								className="flex flex-col gap-2 px-0.5 pt-1 sm:flex-row"
								onSubmit={(event) => {
									event.preventDefault();
									event.stopPropagation();
									form.handleSubmit();
								}}>
								<div className="relative w-full">
									<SearchLinear className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<form.Field name="query">
										{(field) => (
											<Input
												className="min-w-0 pl-9"
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(
														event.target
															.value,
													)
												}
												placeholder="Search files or folders..."
												value={field.state.value}
											/>
										)}
									</form.Field>
								</div>
							</form>

							{listError && (
								<p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">
									{listError}
								</p>
							)}

							<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
								<div className="flex shrink-0 items-center justify-between border-b bg-muted/20 px-3 py-2">
									<h3 className="truncate text-md lowercase font-sans font-medium">
										{accountLabel}
									</h3>
									<span className="shrink-0 text-xs text-muted-foreground">
										{selectedItemList.length} selected
									</span>
								</div>
								<div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
									{isLoadingFiles &&
									treeData.items.root.children?.length === 0 ? (
										<div className="flex h-full items-center justify-center p-3 text-base text-muted-foreground">
											<Spinner size={30} />
										</div>
									) : (
										<FileTree
											checkedItems={checkedTreeItems}
											emptyMessage="No supported Google Drive files or folders found."
											items={treeData.items}
											loadingItemIds={
												loadingFolderItemIds
											}
											onCheckedItemsChange={
												handleTreeSelectionChange
											}
											onFolderClick={
												handleTreeFolderClick
											}
											rootItemId="root"
										/>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					{isConnected && (
						<>
							<Button
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isIngesting}>
								Cancel
							</Button>
							<Button
								disabled={
									selectedItemList.length === 0 || isIngesting
								}
								onClick={() => ingestItems(selectedItemList)}>
								{isIngesting ? (
									<>
										<Spinner className="text-white h-4 w-4" />
										Ingesting...
									</>
								) : (
									`Ingest ${selectedItemList.length || ""} item${selectedItemList.length === 1 ? "" : "s"}`
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
