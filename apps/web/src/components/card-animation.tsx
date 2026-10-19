import { useEffect, useReducer } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
	Paperclip,
	Play,
	Search,
	FileText,
	Code,
	Image as ImageIcon,
	LayoutTemplate,
	Link as LinkIcon,
	PenTool,
	MessageSquare,
	Slack,
	CheckCircle2,
} from "lucide-react";

const TEXT_TO_TYPE = "Hey Fern,\nCan you write a help article for our new CSV exporter?";

const STEPS = [
	{ icon: Search, text: "Searching your knowledge base" },
	{ icon: FileText, text: "Reading support tickets" },
	{ icon: Code, text: "Browsing your codebase" },
	{ icon: ImageIcon, text: "Taking screenshots" },
	{ icon: LayoutTemplate, text: "Planning content structure" },
	{ icon: LinkIcon, text: "Linking to other articles" },
	{ icon: PenTool, text: "Writing..." },
];

type CardAnimationState = {
	phase: 1 | 2 | 3;
	typedChars: number;
};

function cardAnimationReducer(state: CardAnimationState, action: Partial<CardAnimationState>) {
	return { ...state, ...action };
}

export function CardAnimation() {
	const [state, updateState] = useReducer(cardAnimationReducer, {
		phase: 1,
		typedChars: 0,
	});
	const { phase, typedChars } = state;

	// Phase 1: Typing
	useEffect(() => {
		if (phase === 1) {
			if (typedChars < TEXT_TO_TYPE.length) {
				const timeout = setTimeout(
					() => {
						updateState({ typedChars: typedChars + 1 });
					},
					Math.random() * 40 + 30,
				); // Random typing speed
				return () => clearTimeout(timeout);
			} else {
				// Wait briefly after typing is done, then go to Phase 2
				const timer = setTimeout(() => updateState({ phase: 2 }), 1500);
				return () => clearTimeout(timer);
			}
		}
	}, [phase, typedChars]);

	// Phase 2: Processing steps
	useEffect(() => {
		if (phase === 2) {
			// 7 steps, ~400ms delay between each step = 2.8s total
			const timer = setTimeout(() => updateState({ phase: 3 }), STEPS.length * 500 + 1000);
			return () => clearTimeout(timer);
		}
	}, [phase]);

	// Container variants
	const containerVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.5,
				staggerChildren: 0.4,
			},
		},
		exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
	};

	const stepVariants = {
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { type: "spring" as const, stiffness: 300, damping: 24 },
		},
	};

	return (
		<div className="relative w-full max-w-[1000px] h-[600px] bg-white rounded-[24px] shadow-2xl flex flex-col overflow-hidden border border-gray-100/50 backdrop-blur-sm group hover:shadow-3xl transition-shadow duration-500">
			{/* Header */}
			<div className="flex-none h-16 bg-gradient-to-r from-[#0F2C1F] to-[#1A3F2E] flex items-center justify-between px-6">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
						<span className="text-xl">🌿</span>
					</div>
					<span className="text-white font-medium">What can I help with?</span>
				</div>

				<div className="flex items-center gap-4 border border-white/10 rounded-full px-3 py-1.5 bg-black/20">
					<span className="text-white/80 text-sm">Connected to</span>
					<div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
					<div className="flex items-center gap-2">
						<MessageSquare size={14} className="text-indigo-400" />
						<Slack size={14} className="text-pink-400" />
						<div className="w-[1px] h-4 bg-white/20 mx-1" />

						{/* Toggle switch visual */}
						<div className="w-8 h-4 bg-green-500 rounded-full relative cursor-pointer">
							<div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow" />
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex-1 bg-[#FAFAFA] relative overflow-hidden flex flex-col">
				<AnimatePresence mode="wait">
					{/* Phase 1: Typing state */}
					{phase === 1 && (
						<motion.div
							key="phase-1"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{
								opacity: 0,
								y: -20,
								transition: { duration: 0.3 },
							}}
							className="flex-1 flex flex-col p-6">
							<div className="flex-1">
								<p className="text-gray-800 text-lg whitespace-pre-wrap leading-relaxed font-medium">
									{TEXT_TO_TYPE.substring(0, typedChars)}
									<motion.span
										animate={{ opacity: [1, 0] }}
										transition={{
											repeat: Infinity,
											duration: 0.8,
										}}
										className="inline-block w-0.5 h-5 bg-black ml-0.5 align-middle"
									/>
								</p>
							</div>

							{/* Bottom Input Area */}
							<motion.div
								layoutId="bottom-bar"
								className="mt-auto h-16 bg-white border border-gray-200 rounded-2xl flex items-center justify-between px-4 shadow-sm">
								<button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
									<Paperclip size={20} />
								</button>
								<div className="flex items-center gap-3">
									<button className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl font-medium flex items-center gap-2 transition-all group">
										<Play
											size={16}
											className="text-green-400 fill-green-400 group-hover:scale-110 transition-transform"
										/>
										Write my docs / try it!
									</button>
								</div>
							</motion.div>
						</motion.div>
					)}

					{/* Phase 2: Processing steps */}
					{phase === 2 && (
						<motion.div
							key="phase-2"
							variants={containerVariants}
							initial="hidden"
							animate="visible"
							exit="exit"
							className="flex-1 p-8 flex flex-col justify-center max-w-2xl mx-auto w-full">
							<div className="space-y-6">
							{STEPS.map((step, idx) => (
								<motion.div
									key={step.text}
									variants={stepVariants}
									className="flex items-center gap-4 text-gray-700">
										<div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
											<step.icon size={16} />
										</div>
										<span className="font-medium text-lg">
											{step.text}
										</span>
										{idx === STEPS.length - 1 && (
											<motion.div
												animate={{
													opacity: [
														0.3, 1, 0.3,
													],
												}}
												transition={{
													repeat: Infinity,
													duration: 1.5,
												}}
												className="w-1.5 h-1.5 bg-gray-400 rounded-full ml-2"
											/>
										)}
									</motion.div>
								))}
							</div>
						</motion.div>
					)}

					{/* Phase 3: Article Reveal */}
					{phase === 3 && (
						<motion.div
							key="phase-3"
							initial={{ opacity: 0, scale: 0.98 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
							className="flex-1 flex flex-col bg-white overflow-hidden">
							{/* Article Header */}
							<div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-[#FAFAFA]/50">
								<div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
									<span className="text-lg">🌿</span>
									I've drafted this article!
								</div>
								<button className="px-4 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
									Publish draft
								</button>
							</div>

							{/* Article Content */}
							<div className="flex-1 overflow-auto p-12">
								<div className="max-w-3xl mx-auto space-y-6">
									<h1 className="text-4xl font-bold text-gray-900 tracking-tight">
										How to export your Ferndesk articles to
										a CSV
									</h1>

									<div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
										<CheckCircle2
											className="text-blue-500 mt-0.5 flex-shrink-0"
											size={20}
										/>
										<p className="text-sm/relaxed">
											Learn more about advanced export
											options in our{" "}
											<a
												href="#"
												className="font-semibold underline underline-offset-2">
												API documentation
											</a>
											.
										</p>
									</div>

									<div className="pt-4 space-y-4">
										<h2 className="text-2xl font-semibold text-gray-900">
											Getting started
										</h2>
										<p className="text-gray-600 leading-relaxed text-lg">
											To begin exporting your articles,
											navigate to the unified dashboard
											and select the 'Export' tab. From
											there, you'll be able to choose
											the CSV format. This will schedule
											a background job to process your
											articles, and you'll receive an
											email with a secure download link
											once it's complete.
										</p>
										<p className="text-gray-600 leading-relaxed text-lg">
											Make sure your account has the
											correct permissions. Only
											Workspace Admins have the ability
											to perform bulk exports of the
											knowledge base.
										</p>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Tiny minimize icon */}
			<div className="absolute bottom-4 right-4 text-gray-400 hover:text-black transition-colors cursor-pointer bg-white shadow-sm p-1.5 rounded-md border border-gray-100">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round">
					<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
					<line x1="8" y1="21" x2="16" y2="21" />
					<line x1="12" y1="17" x2="12" y2="21" />
				</svg>
			</div>

			{/* Replay button */}
			<button
				onClick={() => {
					updateState({ phase: 1, typedChars: 0 });
				}}
				className="absolute top-20 right-4 text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
				title="Replay Animation">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round">
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
			</button>
		</div>
	);
}
