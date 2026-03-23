import { BoltLinear } from "@/assets/icons/bolt-duotone";
import { Button } from "../ui/button";

export const NoWorkflowsPlaceholder = () => {
	return (
		<div className="text-center max-w-sm mx-auto">
			<div className="relative inline-block">
				<div
					className="bg-gray-50 max-w-2xl mx-auto flex items-center mb-2 size-20 shrink-0 justify-center rounded-full border"
					aria-hidden="true">
					<BoltLinear className="h-10 w-10 text-muted-foreground" />
				</div>
				<span className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground border-2 border-background">
					0
				</span>
			</div>
			<p className="mt-4 text-base font-medium">No workflows added</p>
			<p className="text-sm my-2 text-muted-foreground">
				Create custom workflows that connect your favorite tools.
			</p>
			<Button>Create a workflow </Button>
		</div>
	);
};
