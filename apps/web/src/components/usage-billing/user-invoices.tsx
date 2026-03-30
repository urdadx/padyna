import { trpc, trpcClient } from "@/utils/trpc";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import Spinner from "../ui/spinner";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amount / 100);
}

function formatDate(date: Date | string): string {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

const PAGE_SIZE = 5;

export function UserInvoices() {
	const [page, setPage] = useState(0);

	const { data: orderList = [] } = useSuspenseQuery(
		trpc.subscription.getOrganizationOrderList.queryOptions(),
	);

	const {
		mutate: downloadInvoice,
		isPending,
		variables,
	} = useMutation({
		mutationFn: async (orderId: string) => {
			return trpcClient.subscription.getOrderInvoice.query({ orderId });
		},
		onSuccess: (url) => {
			window.open(url, "_blank");
			toast.success("Invoice downloaded successfully!");
		},
		onError: () => {
			toast.error("Failed to generate invoice. Please try again.");
		},
	});

	const totalPages = Math.ceil(orderList.length / PAGE_SIZE);
	const paginatedOrders = orderList.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-6">
				<h3 className="text-xl font-semibold text-foreground">Invoices</h3>
			</div>

			{orderList.length === 0 ? (
				<div className="flex flex-col gap-3 justify-center h-32 px-6 pb-6">
					<h2 className="text-lg font-semibold text-center">
						No invoices found.
					</h2>
					<p className="text-center text-sm text-muted-foreground">
						Once a payment cycle ends, you'll be able to see invoices.
					</p>
				</div>
			) : (
				<div className="">
					<div className="divide-y">
						{paginatedOrders.map((order) => (
							<div
								key={order.id}
								className="grid grid-cols-12 gap-4 px-6 py-4 items-center text-sm">
								<div className="col-span-3">
									{formatDate(order.createdAt)}
								</div>

								<div className="col-span-3 font-medium">
									{formatCurrency(
										order.totalAmount,
										order.currency,
									)}
								</div>
								<div className="flex items-center gap-2 text-sm capitalize text-muted-foreground col-span-3 justify-center">
									{" "}
									<div
										className={cn(
											"rounded-full w-2 h-2 shrink-0",
											order.paid === true
												? "bg-green-500"
												: "bg-red-800",
										)}
									/>
									<span className="w-16">{order.status}</span>
								</div>
								<div className="col-span-3 flex justify-end">
									<Button
										size="sm"
										variant="outline"
										onClick={() =>
											downloadInvoice(order.id)
										}
										disabled={
											isPending &&
											variables === order.id
										}>
										{isPending && variables === order.id ? (
											<Spinner className="text-black" />
										) : (
											"Download"
										)}
									</Button>
								</div>
							</div>
						))}
					</div>

					{totalPages > 1 && (
						<div className="flex items-center bg-gray-50 rounded-b-2xl justify-end px-6 gap-2 py-3 border-t">
							<Button
								size="sm"
								variant="outline"
								onClick={() => setPage((p) => p - 1)}
								disabled={page === 0}>
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								{page + 1} / {totalPages}
							</span>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setPage((p) => p + 1)}
								disabled={page >= totalPages - 1}>
								Next
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
