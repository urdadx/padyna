import { motion } from "motion/react";
import { Button } from "./button";

interface MotionButtonProps {
	title: string;
	fn?: () => void;
}

export const MotionButton = ({ title, fn }: MotionButtonProps) => {
	return (
		<>
			<motion.div
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				className="relative w-full">
				<Button className="w-full" type="submit" onClick={fn}>
					{title}
				</Button>
			</motion.div>
		</>
	);
};
