import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import OnboardingImage from "@/assets/images/fire-lookout.webp";
import { StepOne } from "./step-one";
import { StepTwo } from "./step-two";
import { StepThree } from "./step-three";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AgentPreviewPanel } from "../agent/agent-preview";

export function OnboardingForm({ className, ...props }: React.ComponentProps<"div">) {
	const navigate = useNavigate({ from: "/onboarding/" });

	const { step } = useSearch({ from: "/onboarding/" });
	const [currentStep, setCurrentStep] = useState(step);

	const setStep = (step: "one" | "two" | "three") => {
		setCurrentStep(step);
		navigate({ search: { step: step as "one" | "two" | "three" } });
	};

	return (
		<div
			className={cn(
				"flex flex-col gap-6 h-full border rounded-xl onboarding-height overflow-hidden justify-center",
				className,
			)}
			{...props}>
			<Card className="overflow-hidden p-0 onboarding-height rounded-none border-0">
				<CardContent className="grid p-0 md:grid-cols-2 h-full">
					<div className="relative overflow-hidden h-full">
						<AnimatePresence mode="wait">
							{currentStep === "one" && (
								<motion.div
									key="step-one"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									transition={{
										duration: 0.1,
										ease: "easeOut",
									}}
									className="h-full">
									<StepOne onContinue={() => setStep("two")} />
								</motion.div>
							)}
							{currentStep === "two" && (
								<motion.div
									key="step-two"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									transition={{
										duration: 0.1,
										ease: "easeOut",
									}}
									className="h-full">
									<StepTwo
										onBack={() => setStep("one")}
										onContinue={() => setStep("three")}
									/>
								</motion.div>
							)}
							{currentStep === "three" && (
								<motion.div
									key="step-three"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									transition={{
										duration: 0.1,
										ease: "easeOut",
									}}
									className="h-full">
									<StepThree onBack={() => setStep("two")} />
								</motion.div>
							)}
						</AnimatePresence>
					</div>
					<div className="relative hidden h-full border-l md:block bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[24px_24px]">
						<img
							src={OnboardingImage}
							alt="Image"
							loading="lazy"
							className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
						/>
						{currentStep === "three" && (
							<motion.div
								key="step-two"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{
									duration: 0.1,
									ease: "easeIn",
								}}
								className="h-full">
								<AgentPreviewPanel />
							</motion.div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
