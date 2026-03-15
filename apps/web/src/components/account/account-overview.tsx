import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { UploadLinear } from "@/assets/icons/upload-icon";
import { authClient, useSession } from "@/lib/auth-client";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function AccountOverview() {
	const { data: session, isPending } = useSession();

	if (isPending || !session) {
		return (
			<div className="rounded-2xl border bg-card text-card-foreground">
				<div className="p-3 px-4 sm:px-6">
					<h3 className="text-xl font-semibold text-foreground">Overview</h3>
					<div className="space-y-0 relative">
						<div className="flex flex-col gap-2 py-2">
							<Label className="text-sm text-muted-foreground">
								Avatar
							</Label>
							<div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
								<Skeleton className="h-16 w-16 rounded-2xl" />
								<Skeleton className="h-8 w-28" />
							</div>
						</div>
						<div className="flex flex-col gap-2 py-4">
							<Label className="text-sm text-muted-foreground">
								Username
							</Label>
							<Skeleton className="h-8 w-full" />
						</div>
					</div>
				</div>
				<div className="border-t border-border bg-gray-50 p-3 px-4 sm:px-6 rounded-b-2xl">
					<Skeleton className="h-8 w-16" />
				</div>
			</div>
		);
	}

	return <AccountForm session={session} />;
}

function AccountForm({ session }: { session: any }) {
	const [username, setUsername] = useState(session.user.name || "");
	const [updatedImage, setUpdatedImage] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			setUpdatedImage(event.target?.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleUpdateUser = async () => {
		const { error } = await authClient.updateUser({
			name: username,
			image: updatedImage || session.user.image,
		});

		if (error) {
			toast.error("Failed to update. Please try again");
		} else {
			toast.success("Changes saved");
		}
	};

	return (
		<div className="rounded-2xl border bg-card text-card-foreground">
			<div className="p-3 px-4 sm:px-6">
				<h3 className="text-xl font-semibold text-foreground">Overview</h3>
				<div className="space-y-0 relative">
					<div className="flex flex-col gap-2 py-2">
						<Label className="text-sm text-muted-foreground">Avatar</Label>

						<div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
							<Avatar className="h-16 w-16 rounded-2xl">
								<AvatarImage
									className="rounded-2xl object-cover"
									src={
										updatedImage ||
										session.user.image ||
										`https://api.dicebear.com/9.x/glass/svg?seed=${session.user.name}`
									}
								/>
							</Avatar>
							<input
								type="file"
								ref={fileInputRef}
								className="hidden"
								accept="image/*"
								onChange={handleImageUpload}
							/>
							<Button
								className="font-normal text-gray-800"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}>
								<UploadLinear className="mr-1 h-4 w-4" />
								Change avatar
							</Button>
						</div>
					</div>
					<div className="flex flex-col gap-2 py-4">
						<Label className="text-sm text-muted-foreground">
							Username
						</Label>
						<Input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="h-8 w-full bg-white outline-2"
						/>
					</div>
				</div>
			</div>
			<div className="border-t border-border bg-gray-50 p-3 px-4 sm:px-6 rounded-b-2xl">
				<Button size="sm" onClick={handleUpdateUser}>
					Save
				</Button>
			</div>
		</div>
	);
}
