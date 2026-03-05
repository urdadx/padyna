import { Globe } from "@/assets/icons/globe-icon";

export const PreviewBox = () => {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="relative z-10 w-full max-w-md group">
				<div className="rounded-xl p-2 bg-linear-to-r from-purple-300 to-purple-600  ">
					<div className="rounded-xl bg-background backdrop-blur-xl p-5 flex flex-col gap-4">
						<div className="flex gap-2">
							<div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56]" />
							<div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E]" />
							<div className="w-3.5 h-3.5 rounded-full bg-[#27C93F]" />
						</div>
						<div className="w-full flex rounded-md items-center justify-center border">
							<div className="w-full max-w-xl h-10 rounded-xl border border-white/5 bg-white/3 flex items-center justify-center transition-colors group-hover:bg-white/5">
								<Globe className="w-5 h-5" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
