import { motion, useScroll, useTransform } from "framer-motion";
import { useMotionBudget } from "@/stores/usePerformanceStore";

export const GlobalGlow = () => {
    const { tier, rich } = useMotionBudget();
    const { scrollY } = useScroll();

    // Start fading in after 50% of the viewport height (mid-Hero)
    // Fully visible by 120% of viewport (start of About).
    // Driven by motion values so scrolling never re-renders React.
    const progress = useTransform(scrollY, (latest) => {
        const vh = window.innerHeight;
        const start = vh * 0.5;
        const end = vh * 1.2;
        return Math.min(1, Math.max(0, (latest - start) / (end - start)));
    });
    const y = useTransform(progress, (p) => 100 - p * 100);

    // Two large fixed blurs are too much for weak GPUs
    if (tier === "low") return null;

    return (
        <motion.div
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-none h-[160px] md:h-[240px] w-full"
            style={{
                opacity: progress,
                y,
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
            }}
        >
            <div className={`absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-cyan-700/30 via-cyan-800/20 to-transparent opacity-70 ${rich ? "animate-pulse" : ""}`}
                style={{
                    animationDuration: '4s'
                }}
            />
            <div
                // A soft ellipse drawn with a gradient: it looks like the blurred one it replaces at a fraction of the cost
                className={`absolute bottom-[-220px] left-1/2 -translate-x-1/2 w-[140%] h-[480px] bg-[radial-gradient(ellipse_closest-side,rgba(29,78,216,0.25),rgba(29,78,216,0.12)_45%,rgba(29,78,216,0.04)_75%,transparent)] ${rich ? "animate-pulse" : ""}`}
                style={{
                    animationDuration: '6s'
                }}
            />
        </motion.div>
    );
};
