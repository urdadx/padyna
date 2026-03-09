import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { CuteIconWrapper } from "./cute-icon-wrapper";
import { WalletLinear } from "@/assets/icons/wallet";

export function UserSubscriptions() {
	const subscriptions = [
		{
			name: "Growth Plan",
			usage: "3,000 credits",
			price: "$0 / mo",
			endDate: "2024-12-31",
		},
	];

	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-6">
				<h3 className="text-xl font-semibold text-foreground">Subscriptions</h3>
				<div className="space-y-0 relative">
					{subscriptions.map((sub, index) => (
						<div
							key={sub.name}
							className={`flex items-center justify-between py-3 ${
								index !== subscriptions.length - 1
									? "border-b border-border/50"
									: ""
							}`}>
							<div className="text-sm flex items-center gap-2 text-muted-foreground">
								<CuteIconWrapper
									color="green"
									icon={WalletLinear}
								/>
								<span>{sub.name}</span>
							</div>
							<div className="flex items-center gap-12">
								<div className="text-sm text-foreground">
									{sub.usage}
								</div>
								<div className="text-sm text-foreground w-16 text-right">
									{sub.price}
								</div>
								<Popover>
									<PopoverTrigger>
										<Button
											variant="outline"
											size="icon"
											className="rounded-lg">
											<MoreHorizontal className="w-4 h-4" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-40 p-1"
										align="end">
										<div className="flex flex-col">
											<Button
												variant="ghost"
												size="sm"
												className="justify-start gap-2 font-normal">
												Upgrade
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="justify-start gap-2 font-normal text-destructive hover:text-destructive">
												Cancel
											</Button>
										</div>
									</PopoverContent>
								</Popover>
							</div>
						</div>
					))}
				</div>
			</div>
			<div className="p-3 px-6 bg-gray-50 border-t border-border rounded-b-2xl">
				<Button size="sm">Upgrade</Button>
			</div>
		</div>
	);
}
