import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import OnboardingImage from "@/assets/images/busy-desk.webp";
import { StepOne } from "./step-one";
import { StepTwo } from "./step-two";
import { StepThree } from "./step-three";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function OnboardingForm({ className, ...props }: React.ComponentProps<"div">) {
	const [step, setStep] = useState(1);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0 min-h-[90vh]">
				<CardContent className="grid p-0 md:grid-cols-2 ">
					<div className="relative overflow-hidden">
						<AnimatePresence mode="wait">
							{step === 1 && (
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
									<StepOne onContinue={() => setStep(2)} />
								</motion.div>
							)}
							{step === 2 && (
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
										onBack={() => setStep(1)}
										onContinue={() => setStep(3)}
									/>
								</motion.div>
							)}
							{step === 3 && (
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
									<StepThree onBack={() => setStep(2)} />
								</motion.div>
							)}
						</AnimatePresence>
					</div>
					<div className="relative hidden h-[90vh] border-l md:block bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[24px_24px]">
						<img
							src={OnboardingImage}
							alt="Image"
							loading="lazy"
							className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
