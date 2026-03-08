export function UserInvoices() {
	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-6">
				<h3 className="text-xl font-semibold text-foreground">Invoices</h3>
				<div className="flex flex-col gap-3 justify-center  h-32">
					<h2 className="text-lg font-semibold text-center ">
						No invoices found.
					</h2>
					<p className="text-center text-sm ">
						Once a payment cycle ends, you'll be able to see invoices.
					</p>
				</div>
			</div>
		</div>
	);
}
