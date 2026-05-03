import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { FileTree } from "@/components/filetree";
import { NotionIcon } from "@/assets/icons/notion-icon";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Spinner from "../ui/spinner";
import { SearchLinear } from "@/assets/icons/search-icon";

type NotionResource = {
	id: string;
	object: "page" | "data_source";
	parentDataSourceId?: string | null;
	title: string;
	url: string | null;
	lastEditedTime: string | null;
};

type NotionListResponse = {
	results: NotionResource[];
	nextCursor: string | null;
	hasMore: boolean;
};

type NotionStatusResponse = {
	connected: boolean;
	chatbotId?: string;
	integration?: {
		workspaceId: string;
		workspaceName: string | null;
	} | null;
};

type NotionIngestResponse = {
	results: Array<{
		pageId: string;
		status: "synced" | "failed";
		message?: string;
	}>;
};

interface NotionSourceDialogProps {
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

async function fetchNotionStatus() {
	const response = await api.get<NotionStatusResponse>("/api/integrations/notion/status");
	return response.data;
}

async function fetchNotionResources(object: "page" | "data_source", query: string) {
	const response = await api.get<NotionListResponse>("/api/integrations/notion/search", {
		params: {
			object,
			query: query || undefined,
		},
	});
	return response.data;
}

async function fetchDataSourcePages(dataSourceId: string) {
	const response = await api.get<NotionListResponse>(
		`/api/integrations/notion/data-sources/${dataSourceId}/pages`,
	);
	return response.data;
}

export function NotionSourceDialog({ open, onOpenChange }: NotionSourceDialogProps) {
	const [submittedQuery, setSubmittedQuery] = useState("");
	const [openedDataSourceIds, setOpenedDataSourceIds] = useState<Set<string>>(() => new Set());
	const [selectedPages, setSelectedPages] = useState<Record<string, NotionResource>>({});
	const [isConnectingNotion, setIsConnectingNotion] = useState(false);
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
		queryFn: fetchNotionStatus,
		queryKey: ["notion", "status"],
		retry: false,
	});

	const isConnected = Boolean(statusQuery.data?.connected);
	const chatbotId = statusQuery.data?.chatbotId ?? null;
	const workspaceId = statusQuery.data?.integration?.workspaceId ?? null;
	const workspaceName = statusQuery.data?.integration?.workspaceName ?? "Notion workspace";
	const searchEnabled = open && isConnected && Boolean(chatbotId && workspaceId);

	const pagesQuery = useQuery({
		enabled: searchEnabled,
		queryFn: () => fetchNotionResources("page", submittedQuery),
		queryKey: ["notion", "resources", chatbotId, workspaceId, "page", submittedQuery],
		retry: false,
	});

	const dataSourcesQuery = useQuery({
		enabled: searchEnabled,
		queryFn: () => fetchNotionResources("data_source", submittedQuery),
		queryKey: [
			"notion",
			"resources",
			chatbotId,
			workspaceId,
			"data_source",
			submittedQuery,
		],
		retry: false,
	});

	const form = useForm({
		defaultValues: {
			query: "",
		},
		onSubmit: ({ value }) => {
			const nextQuery = value.query.trim();
			if (nextQuery === submittedQuery) {
				void pagesQuery.refetch();
				void dataSourcesQuery.refetch();
				return;
			}

			setSubmittedQuery(nextQuery);
		},
	});
	const query = useStore(form.store, (state) => state.values.query);

	const pages = pagesQuery.data?.results ?? [];
	const dataSources = dataSourcesQuery.data?.results ?? [];
	const openedDataSources = dataSources.filter((dataSource) =>
		openedDataSourceIds.has(dataSource.id),
	);

	const dataSourcePageQueries = useQueries({
		queries: openedDataSources.map((dataSource) => ({
			enabled: searchEnabled,
			queryFn: () => fetchDataSourcePages(dataSource.id),
			queryKey: ["notion", "data-source-pages", chatbotId, workspaceId, dataSource.id],
			retry: false,
		})),
	});

	const selectedPageList = Object.values(selectedPages);
	const isSearchingNotion = pagesQuery.isFetching || dataSourcesQuery.isFetching;
	const isLoadingStatus = statusQuery.isPending && open;
	const loadingDataSourceIds = openedDataSources
		.filter((_, index) => dataSourcePageQueries[index]?.isFetching)
		.map((dataSource) => `data-source:${dataSource.id}`);
	const searchErrors = [
		pagesQuery.error
			? getErrorMessage(pagesQuery.error, "Failed to search Notion pages")
			: null,
		dataSourcesQuery.error
			? getErrorMessage(dataSourcesQuery.error, "Failed to search Notion data sources")
			: null,
	].filter((message): message is string => Boolean(message));
	const statusError = statusQuery.error
		? getErrorMessage(statusQuery.error, "Failed to check Notion connection")
		: null;

	const dataSourceQueryById = useMemo(() => {
		return Object.fromEntries(
			openedDataSources.map((dataSource, index) => [
				dataSource.id,
				dataSourcePageQueries[index],
			]),
		);
	}, [dataSourcePageQueries, openedDataSources]);

	const treeData = useMemo(() => {
		const items: Record<
			string,
			{
				name: string;
				children?: string[];
				type?: "folder" | "file";
				description?: string | null;
			}
		> = {
			root: {
				children: [],
				name: workspaceName,
				type: "folder",
			},
		};
		const pageByTreeId: Record<string, NotionResource> = {};
		const rootChildren: string[] = [];
		const dataSourceIds = new Set(dataSources.map((dataSource) => dataSource.id));
		const dataSourcePageIds = new Set<string>();

		for (const dataSource of dataSources) {
			const folderId = `data-source:${dataSource.id}`;
			const pageQuery = dataSourceQueryById[dataSource.id];
			const hasOpened = openedDataSourceIds.has(dataSource.id);
			const childPages = pageQuery?.data?.results ?? [];
			const childIds = childPages.map(
				(page) => `data-source:${dataSource.id}:page:${page.id}`,
			);

			for (const page of childPages) {
				dataSourcePageIds.add(page.id);
			}

			const errorMessage = pageQuery?.error
				? getErrorMessage(pageQuery.error, "Failed to load data source pages")
				: null;

			items[folderId] = {
				children: childIds,
				description: errorMessage
					? errorMessage
					: pageQuery?.isFetching
						? "Loading pages..."
						: pageQuery?.data
							? childPages.length === 0
								? "No pages found"
								: `${childPages.length} page${childPages.length === 1 ? "" : "s"}`
							: hasOpened
								? "Loading pages..."
								: "Click to load pages",
				name: dataSource.title,
				type: "folder",
			};
			rootChildren.push(folderId);

			for (const page of childPages) {
				const pageTreeId = `data-source:${dataSource.id}:page:${page.id}`;
				items[pageTreeId] = {
					name: page.title,
					type: "file",
				};
				pageByTreeId[pageTreeId] = page;
			}
		}

		const standalonePages = pages.filter(
			(page) =>
				!dataSourcePageIds.has(page.id) &&
				!(page.parentDataSourceId && dataSourceIds.has(page.parentDataSourceId)),
		);

		for (const page of standalonePages) {
			const pageTreeId = `page:${page.id}`;
			items[pageTreeId] = {
				name: page.title,
				type: "file",
			};
			rootChildren.push(pageTreeId);
			pageByTreeId[pageTreeId] = page;
		}

		items.root.children = rootChildren;

		return { items, pageByTreeId };
	}, [dataSourceQueryById, dataSources, openedDataSourceIds, pages, workspaceName]);

	const checkedTreeItems = useMemo(() => {
		return Object.entries(treeData.pageByTreeId)
			.filter(([, page]) => Boolean(selectedPages[page.id]))
			.map(([treeId]) => treeId);
	}, [selectedPages, treeData.pageByTreeId]);

	useEffect(() => {
		if (!open) {
			return;
		}

		setSelectedPages({});
		setOpenedDataSourceIds(new Set());
	}, [open, submittedQuery, workspaceId]);

	useEffect(() => {
		return () => {
			clearPollTimer();
			if (popupRef.current && !popupRef.current.closed) {
				popupRef.current.close();
			}
		};
	}, []);

	useEffect(() => {
		if (!open || !searchEnabled) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			const nextQuery = query.trim();
			if (nextQuery !== submittedQuery) {
				setSubmittedQuery(nextQuery);
			}
		}, 350);

		return () => window.clearTimeout(timeoutId);
	}, [open, query, searchEnabled, submittedQuery]);

	const { mutate: ingestPages, isPending: isIngesting } = useMutation({
		mutationFn: async (payload: NotionResource[]) => {
			const response = await api.post<NotionIngestResponse>(
				"/api/integrations/notion/ingest",
				{
					pages: payload.map((page) => ({
						id: page.id,
						title: page.title,
						url: page.url,
					})),
				},
			);
			return response.data;
		},
		onError: (error: any) => {
			toast.error(getErrorMessage(error, "Failed to ingest Notion pages"));
		},
		onSuccess: (data) => {
			const synced = data.results.filter((result) => result.status === "synced").length;
			const failed = data.results.length - synced;

			if (synced > 0) {
				toast.success(`${synced} Notion page${synced > 1 ? "s" : ""} ingested.`);
			}

			if (failed > 0) {
				toast.warning(`${failed} Notion page${failed > 1 ? "s" : ""} failed.`);
			}

			setSelectedPages({});
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
		const next: Record<string, NotionResource> = {};

		for (const treeItemId of checkedTreeItemIds) {
			const page = treeData.pageByTreeId[treeItemId];
			if (page) {
				next[page.id] = page;
			}
		}

		setSelectedPages(next);
	};

	const handleTreeFolderClick = (treeItemId: string) => {
		const dataSourceId = treeItemId.startsWith("data-source:")
			? treeItemId.replace("data-source:", "")
			: null;

		if (
			!dataSourceId ||
			!dataSources.some((dataSource) => dataSource.id === dataSourceId)
		) {
			return;
		}

		setOpenedDataSourceIds((current) => {
			if (current.has(dataSourceId)) {
				return current;
			}

			const next = new Set(current);
			next.add(dataSourceId);
			return next;
		});
	};

	const handleNotionConnect = async () => {
		setIsConnectingNotion(true);
		try {
			const response = await api.get<{ authorizeUrl: string }>(
				"/api/integrations/notion/connect",
			);
			const authorizeUrl = response.data.authorizeUrl;

			if (!authorizeUrl) {
				toast.error("Missing Notion authorization URL");
				setIsConnectingNotion(false);
				return;
			}

			const popup = window.open(
				authorizeUrl,
				"notion-oauth",
				"width=600,height=760,left=200,top=100",
			);

			if (!popup) {
				toast.error("Popup blocked. Please allow popups and try again.");
				setIsConnectingNotion(false);
				return;
			}

			popupRef.current = popup;
			clearPollTimer();

			pollTimerRef.current = window.setInterval(async () => {
				if (!popupRef.current || popupRef.current.closed) {
					clearPollTimer();
					await statusQuery.refetch();
					setIsConnectingNotion(false);
					return;
				}

				try {
					const statusResponse = await statusQuery.refetch();
					if (statusResponse.data?.connected) {
						popupRef.current.close();
						clearPollTimer();
						setIsConnectingNotion(false);
						toast.success("Notion connected");
					}
				} catch {
					// Ignore transient polling failures while OAuth is in progress.
				}
			}, 1000);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to start Notion OAuth flow"));
			setIsConnectingNotion(false);
		}
	};

	const isCompactDialog = !isLoadingStatus && (!isConnected || Boolean(statusError));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={
					isCompactDialog
						? "flex h-auto w-full sm:max-w-xl! flex-col overflow-hidden"
						: "flex h-[75vh] w-full sm:max-w-xl! flex-col overflow-hidden"
				}>
				<DialogHeader className="gap-0">
					<DialogTitle className="text-xl font-semibold">
						Connect Notion
					</DialogTitle>
					<DialogDescription className="mt-0">
						Select pages or databases containing relevant knowledge base
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
							<div className="mb-4 flex items-start gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
									<NotionIcon
										className="size-5"
										color="currentColor"
									/>
								</div>
								<div className="min-w-0">
									<h3 className="font-medium font-sans text-foreground">
										Connect Notion
									</h3>
									<p className="mt-1 text-muted-foreground text-sm">
										Authorize a Notion workspace to select
										shared pages and databases.
									</p>
								</div>
								<Button
									variant="outline"
									disabled={isConnectingNotion}
									onClick={handleNotionConnect}>
									{isConnectingNotion ? (
										<>
											<Spinner />{" "}
										</>
									) : (
										"Connect"
									)}
								</Button>
							</div>
						</div>
					) : (
						<div className="flex h-full min-w-0 flex-col gap-2">
							<form
								className="flex flex-col gap-2 px-0.5 py-1 sm:flex-row"
								onSubmit={(event) => {
									event.preventDefault();
									event.stopPropagation();
									form.handleSubmit();
								}}>
								<form.Field name="query">
									{(field) => (
										<div className="relative w-full">
											<Input
												className="min-w-0 h-9 pl-9"
												name={field.name}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(
														event.target
															.value,
													)
												}
												placeholder="Search pages or databases..."
												value={field.state.value}
											/>
											<SearchLinear className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										</div>
									)}
								</form.Field>
							</form>

							{searchErrors.map((message) => (
								<p
									className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm"
									key={message}>
									{message}
								</p>
							))}

							<div className="flex min-h-0 min-w-0 mt-2 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
								<div className="flex shrink-0 items-center justify-between border-b bg-muted/20 px-3 py-2">
									<div className="min-w-0">
										<h3 className="truncate text-md capitalize font-sans font-medium">
											{workspaceName}
										</h3>
									</div>
									<span className="shrink-0 text-xs text-muted-foreground">
										{selectedPageList.length} selected
									</span>
								</div>

								<div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
									{isSearchingNotion &&
									treeData.items.root.children?.length === 0 ? (
										<div className="flex h-full items-center justify-center p-3 text-base text-muted-foreground">
											<Spinner size={30} />
										</div>
									) : (
										<FileTree
											checkedItems={checkedTreeItems}
											emptyMessage="No shared pages or data sources found."
											items={treeData.items}
											loadingItemIds={
												loadingDataSourceIds
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
								onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button
								disabled={
									selectedPageList.length === 0 || isIngesting
								}
								onClick={() => ingestPages(selectedPageList)}>
								{isIngesting ? (
									<>
										<Spinner className="text-white" />{" "}
										Ingesting...
									</>
								) : (
									`Ingest ${selectedPageList.length || ""} item${selectedPageList.length === 1 ? "" : "s"}`
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
