import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import { AlertTriangleIcon } from "lucide-react";

export const Route = createFileRoute("/invitation/error")({
	component: ErrorPage,
});

function ErrorPage() {
	return (
		<main className="relative h-full w-full bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] before:absolute before:-z-10 before:inset-0 before:bg-[radial-gradient(circle_at_left,rgba(251,146,60,0.05),rgba(139,92,246,0.05),transparent_50%)] after:absolute after:-z-10 after:inset-0 after:bg-[radial-gradient(circle_at_right,rgba(251,146,60,0.05),rgba(139,92,246,0.05),transparent_50%)] flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
			<div className="flex min-h-screen items-center justify-center p-4">
				<Card className="w-full h-fit rounded-xl max-w-md bg-white">
					<CardContent className="p-6 text-center">
						<div className="relative mb-6">
							<div className="relative mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center transition-colors duration-500">
								<AlertTriangleIcon
									color="white"
									className="w-8 h-8 stroke-3"
								/>
							</div>
						</div>

						<h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
							Something Went Wrong
						</h1>
						<p className="text-gray-500 text-base mb-6 sm:mb-8 leading-relaxed">
							We encountered an error while processing your invitation.
							Please try again or contact your organization
							administrator.
						</p>

						<div className="flex flex-col gap-3">
							<Link to="/login" className="w-full">
								<motion.div
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="relative w-full">
									<Button className="w-full text-sm sm:text-base h-10">
										Go to login
									</Button>
								</motion.div>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
