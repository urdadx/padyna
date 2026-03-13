import { cn } from "@/lib/utils";
import PadynaLogo from "@/assets/images/logo.svg";
import WebsiteLogo from "@/assets/website.png";
import Spinner from "../ui/spinner";

interface AvatarStackProps {
	className?: string;
	websiteUrl?: string;
	websiteFavicon?: string;
	isLoading?: boolean;
}

export function AvatarStack({ className, websiteFavicon, isLoading }: AvatarStackProps) {
	return (
		<div className={cn("flex items-center gap-2 overflow-hidden", className)}>
			<img
				className="inline-block h-10 w-10 rounded-xl ring-2 ring-white dark:ring-gray-800 rotate-10 object-cover"
				src={PadynaLogo}
				alt="User"
			/>
			<span className="text-muted-foreground font-light">---</span>
			<div className="relative">
				<img
					className="inline-block h-10 w-10 rounded-lg ring-2 ring-white dark:ring-gray-800 rotate-[-5deg] object-cover"
					src={websiteFavicon || WebsiteLogo}
					alt="Organization"
				/>
				{isLoading && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
						<Spinner color="white" size={16} />
					</div>
				)}
			</div>
		</div>
	);
}
