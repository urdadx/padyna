import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const text =
  "When I first opened Padyna, I instantly felt like this was the next generation of customer support ";

export function ScrollText() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const words = text.split(" ");

  return (
    <div ref={containerRef} className="relative h-[150vh] w-full">
      <div className="sticky top-(--site-header-height) flex h-[calc(100vh-var(--site-header-height))] items-center justify-center px-6">
        <p className="font-display lg:text-heading-lg max-w-[18em] text-center text-[35px] leading-tight tracking-tight sm:text-[55px]">
          {words.map((word, i) => {
            const start = i / words.length;
            const end = (i + 1) / words.length;

            return (
              <Word key={i} progress={scrollYProgress} range={[start, end]}>
                {word}
              </Word>
            );
          })}
        </p>
      </div>
    </div>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: any;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const color = useTransform(progress, range, ["#CAD0D9", "#1C1D1F"]);

  return (
    <>
      <span className="relative mr-1.5 inline-block">
        <motion.span
          style={{ opacity, color }}
          className="transition-colors duration-100"
        >
          {children}
        </motion.span>
      </span>
    </>
  );
}
