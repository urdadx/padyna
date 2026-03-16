import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export const IntegrationCard = ({ data }: { data: any }) => {
	return (
		<div className="bg-white rounded-lg p-4 border border-gray-200  w-full max-w-md mx-auto h-full">
			<div className="flex flex-col gap-2 sm:gap-2.5 h-full">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-2">
						<img
							className="size-7 sm:size-8"
							src={data.logo}
							alt="integration-icon"
							loading="lazy"
						/>
					</div>
					<Badge variant="outline" className="gap-1 text-xs">
						<span className="size-2 rounded-full bg-green-500"></span>
						Connected
					</Badge>
				</div>
				<h3 className="font-medium font-sans text-sm sm:text-base">{data.name}</h3>
				<p className="text-gray-600 text-sm sm:text-md grow">{data.description}</p>
				<Button className="w-fit rounded-sm text-sm h-9" variant="outline">
					Connect
				</Button>
			</div>
		</div>
	);
};
