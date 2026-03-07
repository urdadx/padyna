import type { Table } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";

interface TablePaginationProps<TData> {
	table: Table<TData>;
}

export function TablePagination<TData>({ table }: TablePaginationProps<TData>) {
	const id = useId();

	return (
		<div className="flex items-center justify-between gap-8">
			<div className="flex items-center gap-1">
				<Label className="max-sm:sr-only" htmlFor={id}>
					Total size:
				</Label>
				<span className="font-medium text-sm">{`12 MB`}</span>
			</div>
			<div className="flex grow justify-end whitespace-nowrap text-muted-foreground text-sm">
				<p
					aria-live="polite"
					className="whitespace-nowrap text-muted-foreground text-sm">
					<span className="text-foreground">
						{table.getState().pagination.pageIndex *
							table.getState().pagination.pageSize +
							1}
						-
						{Math.min(
							Math.max(
								table.getState().pagination.pageIndex *
									table.getState().pagination.pageSize +
									table.getState().pagination.pageSize,
								0,
							),
							table.getRowCount(),
						)}
					</span>{" "}
					of{" "}
					<span className="text-foreground">
						{table.getRowCount().toString()}
					</span>
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
