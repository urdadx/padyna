import { createFileRoute } from "@tanstack/react-router";
import { CardAnimation } from "@/components/card-animation";

export const Route = createFileRoute("/(admin)/animation")({
	component: AnimationPage,
});

function AnimationPage() {
	return (
		<div className="min-h-[calc(100vh-(--spacing(16)))] w-full bg-[#FAFAFA] flex items-center justify-center p-8 overflow-hidden">
			<CardAnimation />
		</div>
	);
}
