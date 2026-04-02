import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface TypingIndicatorProps {
	name?: string;
	avatarSrc?: string;
	label?: string;
	className?: string;
	isAdmin?: boolean;
}

export const TypingIndicator = ({
	name = "User",
	avatarSrc,
	isAdmin = false,
}: TypingIndicatorProps) => {
	return (
		<div className="flex items-center gap-3 text-muted-foreground text-sm py-2">
			<Avatar className="rounded-full overflow-hidden">
				{avatarSrc ? <AvatarImage src={avatarSrc} alt={name} /> : null}
				<AvatarFallback className="bg-primary text-sm text-white font-medium uppercase">
					{isAdmin ? "A" : "U"}
				</AvatarFallback>
			</Avatar>
			<div className="flex items-center gap-2">
				<div className="flex gap-1 items-center">
					<span
						className="inline-block size-1 rounded-full bg-current animate-bounce"
						style={{
							animationDelay: "0ms",
							animationDuration: "0.6s",
						}}
					/>
					<span
						className="inline-block size-1 rounded-full bg-current animate-bounce"
						style={{
							animationDelay: "200ms",
							animationDuration: "0.6s",
						}}
					/>
					<span
						className="inline-block size-1 rounded-full bg-current animate-bounce"
						style={{
							animationDelay: "400ms",
							animationDuration: "0.6s",
						}}
					/>
				</div>
			</div>
		</div>
	);
};
