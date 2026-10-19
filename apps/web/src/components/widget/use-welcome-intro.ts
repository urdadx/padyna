import { useEffect, useRef, useState } from "react";

export type WelcomePhase = "typing" | "shown";

/**
 * Plays a short "typing" beat before the welcome message. Changing `replayKey` (e.g. each
 * time the widget opens) plays it again, unless the conversation already has messages.
 */
export function useWelcomeIntro(replayKey: number, hasMessages: boolean, delayMs = 900) {
	const [phase, setPhase] = useState<WelcomePhase>(hasMessages ? "shown" : "typing");
	// Read at replay time only, so sending the first message doesn't restart the intro.
	const hasMessagesRef = useRef(hasMessages);
	hasMessagesRef.current = hasMessages;

	useEffect(() => {
		if (hasMessagesRef.current) {
			setPhase("shown");
			return;
		}

		setPhase("typing");
		const id = setTimeout(() => setPhase("shown"), delayMs);
		return () => clearTimeout(id);
	}, [replayKey, delayMs]);

	return phase;
}
