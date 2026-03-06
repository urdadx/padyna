import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import Spinner from "./ui/spinner";

export function Pricing() {
	const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
	const [loadingPlanId, _setLoadingPlanId] = useState<number | null>(null);

	const navigate = useNavigate();

	const plans = [
		{
			id: 1,
			name: "Starter",
			tagline: "For solopreneurs and early-stage startups",
			monthlyPrice: 39,
			yearlyPrice: 32,
			yearlySavings: 84,
			description: "For solopreneurs and early-stage startups",
			monthlyProductId: "",
			yearlyProductId: "",
			features: [
				"2,000 message credits",
				"150 scraping credits",
				"1 chatbot",
				"1 team member",
				"10 file uploads (max 10MB each)",
				"Advanced analytics",
				"Integrations",
				"6 months analytics retention",
			],
			isPopular: false,
		},
		{
			id: 2,
			name: "Growth",
			tagline: "For growing teams that need scale and collaboration",
			monthlyPrice: 129,
			yearlyPrice: 109,
			yearlySavings: 240,
			description: "For growing teams that need scale and collaboration",
			monthlyProductId: "",
			yearlyProductId: "",
			features: [
				"10,000 message credits",
				"500 scraping credits",
				"3 chatbots",
				"4 team members",
				"100 file uploads (max 50MB each)",
				"Advanced analytics",
				"Integrations",
				"2 years analytics retention",
			],
			isPopular: true,
		},
		{
			id: 3,
			name: "Professional",
			tagline: "For scaling businesses and agencies",
			monthlyPrice: 399,
			yearlyPrice: 329,
			yearlySavings: 840,
			description: "For scaling businesses and agencies",
			monthlyProductId: "",
			yearlyProductId: "",
			features: [
				"30,000 message credits",
				"2,500 scraping credits",
				"5 chatbots",
				"10 team members",
				"500 file uploads (max 100MB each)",
				"Advanced analytics",
				"Integrations",
				"4 years analytics retention",
			],
			isPopular: false,
		},
	];

	const handleSelectPlan = async () => {
		navigate({
			to: "/dashboard",
		});
	};

	const isLoading = (planId: number) => loadingPlanId === planId;

	return (
		<motion.section
			id="pricing"
			className="py-4 font-sans"
			initial={{ y: 8, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5 }}>
			<div className="mx-auto max-w-6xl px-6">
				<div className="mt-8 ">
					<Tabs
						value={billingPeriod}
						onValueChange={(value) =>
							setBillingPeriod(value as "monthly" | "yearly")
						}
						className=" w-full ">
						<div className="flex flex-col items-center justify-center  w-full">
							<div className="flex items-center justify-center gap-2">
								<TabsList className="grid w-75 grid-cols-2 mx-auto rounded-full p-1">
									<TabsTrigger
										className="rounded-full"
										value="monthly">
										Monthly
									</TabsTrigger>
									<TabsTrigger
										className="relative rounded-full"
										value="yearly">
										Yearly{" "}
										<span className="text-xs text-primary font-semibold ml-2">
											20% off
										</span>
									</TabsTrigger>
								</TabsList>
							</div>
						</div>

						<TabsContent value="monthly" className="mt-8">
							<div className="grid gap-6 lg:grid-cols-3 place-items-center w-full ">
								{plans.map((plan) => (
									<Card
										key={plan.id}
										className="relative overflow-visible bg-gray-50 w-full p-2 max-w-xl shadow-sm ring-muted">
										{plan.isPopular && (
											<span className="bg-primary text-white absolute left-1/2 -top-3 z-20 -translate-x-1/2 flex h-6 w-fit items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">
												Recommended
											</span>
										)}

										<div className="flex flex-col h-full bg-white rounded-lg border ">
											<CardHeader>
												<CardTitle className="font-medium text-lg pt-4">
													{plan.name}
												</CardTitle>
												<span className="my-2 block text-2xl font-sans font-semibold">
													${plan.monthlyPrice}
													<span className="text-sm font-normal text-muted-foreground ">
														/mo
													</span>
												</span>
												<CardDescription className="text-sm">
													{plan.tagline}
												</CardDescription>
											</CardHeader>

											<CardContent className="space-y-4 grow p-4">
												<hr className="border-dashed" />
												<ul className="list-outside space-y-3 text-sm">
													{plan.features.map(
														(
															item,
															index,
														) => (
															<li
																key={
																	index
																}
																className="flex items-start gap-2">
																<Check className="size-3 mt-0.5 text-primary shrink-0" />
																<span>
																	{
																		item
																	}
																</span>
															</li>
														),
													)}
												</ul>
											</CardContent>

											<CardFooter className="p-3">
												<motion.div
													whileHover={{
														scale: 1.02,
													}}
													whileTap={{
														scale: 0.98,
													}}
													className="w-full">
													<Button
														variant={
															plan.isPopular
																? "default"
																: "outline"
														}
														onClick={
															handleSelectPlan
														}
														className="w-full"
														disabled={isLoading(
															plan.id,
														)}>
														{isLoading(
															plan.id,
														) ? (
															<>
																<Spinner className="w-4 h-4 text-white" />
																Processing...
															</>
														) : plan.name ===
														  "Enterprise" ? (
															"Contact Sales"
														) : (
															"Start free trial"
														)}
													</Button>
												</motion.div>
											</CardFooter>
										</div>
									</Card>
								))}
							</div>
						</TabsContent>

						<TabsContent value="yearly" className="mt-8">
							<div className="grid gap-6 lg:grid-cols-3 place-items-center ">
								{plans.map((plan) => (
									<Card
										key={plan.id}
										className="relative overflow-visible bg-gray-50 w-full p-2 max-w-xl shadow-sm ring-muted">
										{plan.isPopular && (
											<div className="absolute left-1/2 -top-3 z-20 -translate-x-1/2">
												<span className="bg-primary text-white flex h-6 items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">
													Recommended
												</span>
											</div>
										)}

										<div className="flex flex-col h-full bg-white rounded-lg border">
											<CardHeader>
												<CardTitle className="font-medium font-sans text-lg pt-4">
													{plan.name}
												</CardTitle>
												<div className="my-3">
													<div className="flex items-center gap-2 mb-2">
														<span className="block text-2xl font-semibold">
															$
															{
																plan.yearlyPrice
															}
															<span className="text-sm font-normal text-muted-foreground ">
																/mo
															</span>
														</span>
													</div>
													{plan.yearlyPrice && (
														<span className="text-sm text-neutral-500">
															Billed
															annually
															($
															{plan.yearlyPrice *
																12}
															/year)
														</span>
													)}
												</div>
											</CardHeader>

											<CardContent className="space-y-4 grow p-4">
												<hr className="border-dashed" />
												<ul className="list-outside space-y-3 text-sm">
													{plan.features.map(
														(
															item,
															index,
														) => (
															<li
																key={
																	index
																}
																className="flex items-start gap-2">
																<Check className="size-3 mt-0.5 text-primary shrink-0" />
																<span>
																	{
																		item
																	}
																</span>
															</li>
														),
													)}
												</ul>
											</CardContent>

											<CardFooter className="p-3">
												<Button
													variant={
														plan.isPopular
															? "default"
															: "outline"
													}
													onClick={
														handleSelectPlan
													}
													className="w-full"
													disabled={isLoading(
														plan.id,
													)}>
													{isLoading(
														plan.id,
													) ? (
														<>
															<Spinner className="w-4 h-4 text-white" />
															Processing...
														</>
													) : plan.name ===
													  "Enterprise" ? (
														"Contact Sales"
													) : (
														"Start free trial"
													)}
												</Button>
											</CardFooter>
										</div>
									</Card>
								))}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</motion.section>
	);
}
