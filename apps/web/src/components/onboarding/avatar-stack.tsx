import { cn } from "@/lib/utils";
import PadynaLogo from "@/assets/images/logo.svg";
interface AvatarStackProps {
	className?: string;
}

export function AvatarStack({ className }: AvatarStackProps) {
	return (
		<div className={cn("flex items-center gap-2 overflow-hidden", className)}>
			<img
				className="inline-block h-10 w-10 rounded-xl ring-2 ring-white dark:ring-gray-800 rotate-[-5deg] object-cover"
				src={PadynaLogo}
				alt="User 1"
			/>
			<span className="text-muted-foreground font-light">---</span>
			<img
				className="inline-block h-10 w-10 rounded-xl ring-2 ring-white dark:ring-gray-800 rotate-10 object-cover"
				src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
				alt="User 2"
			/>
		</div>
	);
}
