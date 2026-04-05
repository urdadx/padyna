import { Link } from "@tanstack/react-router";
import { Badge } from "../ui/badge";

interface ActionCardProps {
	href: string;
	search?: { action: string };
	comingSoon?: boolean;
	icon?: React.ReactNode;
	iconSrc?: string;
	title: string;
	description: string;
}

export const ActionCard = ({
	href,
	search,
	comingSoon,
	icon,
	iconSrc,
	title,
	description,
}: ActionCardProps) => {
	const isComingSoon = comingSoon || title === "Custom workflow" || title === "Custom form";
	const content = (
		<div className="flex gap-4 items-center">
			<div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-subtle flex items-center justify-center border border-border group-hover:border-primary/30 transition-all duration-300">
				{iconSrc ? (
					<img className="w-6 h-6" alt={`${title} icon`} src={iconSrc} />
				) : (
					<div className="text-primary">{icon}</div>
				)}
			</div>
			<div className="flex flex-col flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<h3 className="font-medium font-sans text-md text-foreground">
						{title}
					</h3>
					{isComingSoon && <Badge variant="secondary">Coming soon</Badge>}
				</div>
				<p className="text-sm text-muted-foreground leading-normal">
					{description}
				</p>
			</div>
		</div>
	);

	if (isComingSoon) {
		return (
			<div className="group relative w-full rounded-lg border border-border bg-card p-3 opacity-70 cursor-not-allowed">
				{content}
			</div>
		);
	}

	return (
		<Link
			to={href}
			search={search}
			className="group relative w-full rounded-lg border border-border bg-card p-3 hover:border-primary hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
			{content}
		</Link>
	);
};
