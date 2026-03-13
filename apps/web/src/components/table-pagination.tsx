import type { Table } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";

interface TablePaginationProps<TData> {
	table: Table<TData>;
	totalSize: string;
	isLoading?: boolean;
}

export function TablePagination<TData>({
	table,
	totalSize,
	isLoading = false,
}: TablePaginationProps<TData>) {
	const rowCount = table.getRowCount();
	const pageIndex = table.getState().pagination.pageIndex;
	const pageSize = table.getState().pagination.pageSize;
	const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
	const to = rowCount === 0 ? 0 : Math.min(pageIndex * pageSize + pageSize, rowCount);

	return (
		<div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 sm:gap-8">
			<div className="flex items-center gap-1 order-2 sm:order-0 w-full sm:w-auto mt-2 sm:mt-0">
				<Label className="max-sm:sr-only">Total size:</Label>
				<span className="font-medium text-sm text-foreground sm:text-foreground">
					{isLoading ? "Loading..." : totalSize}
				</span>
			</div>
			<div className="flex grow justify-start sm:justify-end whitespace-nowrap text-muted-foreground text-sm order-1 sm:order-0">
				<p
					aria-live="polite"
					className="whitespace-nowrap text-muted-foreground text-sm">
					<span className="text-foreground">
						{from}-{to}
					</span>{" "}
					of <span className="text-foreground">{rowCount.toString()}</span>
				</p>
			</div>
			<div>
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<Button
								aria-label="Go to previous page"
								className="disabled:pointer-events-none h-9 disabled:opacity-50"
								disabled={!table.getCanPreviousPage()}
								onClick={() => table.previousPage()}
								variant="outline">
								<ChevronLeftIcon aria-hidden="true" />
								Prev
							</Button>
						</PaginationItem>
						<PaginationItem>
							<Button
								aria-label="Go to next page"
								className="disabled:pointer-events-none h-9 disabled:opacity-50"
								disabled={!table.getCanNextPage()}
								onClick={() => table.nextPage()}
								variant="outline">
								Next
								<ChevronRightIcon aria-hidden="true" />
							</Button>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</div>
		</div>
	);
}
