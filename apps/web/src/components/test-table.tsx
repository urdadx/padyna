import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "./ui/button";
import { ArrowUpRight } from "lucide-react";

interface TableData {
	id: number;
	name: string;
	purchaseDate: string;
	amountPaid: string;
	insuranceType: string;
}

const tableData: TableData[] = [
	{
		id: 1,
		name: "John Doe",
		purchaseDate: "2024-06-01",
		amountPaid: "$150",
		insuranceType: "Travel Insurance",
	},
	{
		id: 2,
		name: "Jane Smith",
		purchaseDate: "2024-06-03",
		amountPaid: "$200",
		insuranceType: "Health Insurance",
	},
	{
		id: 3,
		name: "Alice Johnson",
		purchaseDate: "2024-06-05",
		amountPaid: "$180",
		insuranceType: "Travel Insurance",
	},
	{
		id: 4,
		name: "Bob Brown",
		purchaseDate: "2024-06-07",
		amountPaid: "$220",
		insuranceType: "Life Insurance",
	},
];

export function PremiumOverviewTable() {
	return (
		<div className="space-y-3 rounded-xl border">
			<div className=" flex items-center px-4 pt-4 justify-between">
				<h2 className="text-base font-semibold">Recent purchases</h2>
				<Button variant="outline" className="text-sm text-primary rounded-sm">
					See all purchases
					<ArrowUpRight className="h-5 w-5 text-primary" />
				</Button>
			</div>
			<div>
				<Table className="table-fixed">
					<TableHeader className="w-full">
						<TableRow className="bg-rose-50 p-2 w-full text-sm hover:bg-rose-50">
							<TableHead className="font-medium text-rose-600">
								Name
							</TableHead>
							<TableHead className="font-medium text-rose-600">
								Purchase Date
							</TableHead>
							<TableHead className="font-medium text-rose-600">
								Amount Paid
							</TableHead>
							<TableHead className="font-medium text-rose-600">
								Insurance Type
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tableData.map((row) => (
							<TableRow
								key={row.id}
								className="border-b text-sm last:border-0">
								<TableCell className="font-normal">
									{row.name}
								</TableCell>
								<TableCell className="font-normal text-gray-900">
									{row.purchaseDate}
								</TableCell>
								<TableCell className="font-normal text-gray-900">
									{row.amountPaid}
								</TableCell>
								<TableCell className="font-normal text-gray-900">
									{row.insuranceType}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
