"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ClipboardList, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useAboutSectionStore, getAboutCarouselItems } from "@/stores/useAboutSectionStore";


// The three beats of the AI-assisted workflow
const AI_STEPS: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: ClipboardList, title: "Write the spec", text: "Define the problem, constraints and acceptance criteria before any code is written." },
    { icon: Workflow, title: "Direct the agents", text: "Give them the right context and let them handle boilerplate, refactors, tests and docs." },
    { icon: ShieldCheck, title: "Review and ship", text: "I read every change, test it and own the result. Nothing ships unreviewed." },
];

export function AboutSection() {
    const { images, loading, fetchImages } = useAboutSectionStore();
    const carouselItems = getAboutCarouselItems(images);
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [slideCount, setSlideCount] = useState(0);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    const onSelect = useCallback(() => {
        if (!carouselApi) return;
        setCurrentSlide(carouselApi.selectedScrollSnap());
        setSlideCount(carouselApi.scrollSnapList().length);
    }, [carouselApi]);

    useEffect(() => {
        if (!carouselApi) return;
        onSelect();
        carouselApi.on("select", onSelect);
        carouselApi.on("reInit", onSelect);
        return () => {
            carouselApi.off("select", onSelect);
            carouselApi.off("reInit", onSelect);
        };
    }, [carouselApi, onSelect]);

    const containerVariants = useMemo(() => ({
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.225,
                delayChildren: 0.3,
            },
        },
    }), []);

    const itemVariants = useMemo(() => ({
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 1.2,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
            },
        },
    }), []);


    return (
        <section id="about" className="relative overflow-hidden" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <div className="container px-4 md:px-6 relative z-10">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1, margin: "0px 0px -100px 0px" }}
                    variants={containerVariants}
                    className="max-w-6xl mx-auto"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center mb-12 md:mb-16 mx-auto w-fit">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                About Me
                            </span>
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
                            A developer who builds with the craft of an engineer and the speed of AI
                        </p>
                    </motion.div>

                    {/* Intro: photo carousel beside the bio */}
                    <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
                        <motion.div variants={itemVariants} className="lg:col-span-5 relative group max-w-md w-full mx-auto lg:max-w-none lg:h-full">
                            <div className="relative rounded-2xl overflow-hidden aspect-square lg:aspect-auto lg:h-full lg:min-h-[22rem] shadow-2xl shadow-primary/5 bg-muted/20">
                                {loading && carouselItems.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-12 w-12 animate-pulse rounded-full bg-primary/20" aria-hidden />
                                    </div>
                                ) : (
                                    <Carousel
                                        className="w-full h-full"
                                        setApi={setCarouselApi}
                                        opts={{
                                            align: "center",
                                            loop: true,
                                            dragFree: false,
                                            containScroll: "trimSnaps",
                                            skipSnaps: false,
                                            duration: 25,
                                        }}
                                    >
                                        <CarouselContent className="-ml-0 h-full">
                                            {carouselItems.map((item) => (
                                                <CarouselItem key={item.id} className="pl-0 h-full">
                                                    <div className="relative w-full h-full">
                                                        <img
                                                            src={item.src}
                                                            alt={item.label || "About me photo"}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 42vw"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                                        {item.label && (
                                                            <div className="absolute bottom-6 left-6">
                                                                <span className="text-white/90 font-medium text-sm tracking-wider uppercase border-l-2 border-primary pl-3">
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>

                                        {slideCount > 1 && (
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                                                {Array.from({ length: slideCount }).map((_, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        aria-label={`Go to slide ${i + 1}`}
                                                        onClick={() => carouselApi?.scrollTo(i)}
                                                        className={`rounded-full transition-all duration-300 ${
                                                            i === currentSlide
                                                                ? "w-2 h-2 bg-white"
                                                                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </Carousel>
                                )}
                            </div>
                            <div className="absolute -z-10 top-8 -right-8 w-full h-full border border-primary/10 rounded-2xl hidden lg:block" />
                        </motion.div>

                        <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col gap-5 lg:justify-between text-center lg:text-left">
                            <h3 className="font-heading text-2xl sm:text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-foreground">
                                Full Stack Developer building polished, performant products
                            </h3>
                            <p className="text-base md:text-lg leading-relaxed text-muted-foreground/90">
                                I bridge the gap between user needs and technical implementation by building accessible, pixel-perfect interfaces rooted in clean architecture and performance optimization. I build for the AI era, pairing solid engineering fundamentals with AI coding agents to ship faster without cutting corners on quality.
                            </p>
                            <p className="text-base md:text-lg leading-relaxed text-muted-foreground/90">
                                My work spans web, mobile and desktop, from donation platforms and clinic appointment systems to a library portal with a Gemini-powered chatbot. I take a product from idea to deployment, covering the interface, the backend and the database behind it.
                            </p>
                            <p className="text-base md:text-lg leading-relaxed text-muted-foreground/90">
                                I care about the details people actually feel: fast load times, accessible interfaces and a consistent design language. Every project is a chance to ship something I'm proud of and to learn a better way of building it.
                            </p>
                        </motion.div>
                    </div>

                    {/* How I work with AI */}
                    <motion.div variants={itemVariants} className="mt-14 md:mt-20 rounded-2xl border border-border/50 p-6 sm:p-8 lg:p-10 transition-all duration-500 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12 items-start">
                            <div className="text-center lg:text-left">
                                <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground">How I work with AI</h3>
                                <p className="mt-4 text-base leading-relaxed text-muted-foreground/90">
                                    Software development is shifting from typing every line to directing intelligent agents. I work in <strong className="text-foreground">agentic development environments</strong>, so my time goes to architecture, product decisions and polish. AI amplifies the engineer; it doesn't replace judgment.
                                </p>
                            </div>

                            <ol className="grid gap-4 sm:grid-cols-3">
                                {AI_STEPS.map(({ icon: Icon, title, text }, i) => (
                                    <li key={title} className="rounded-xl bg-muted/15 p-5 text-center">
                                        <div className="flex items-center justify-center gap-2.5">
                                            <Icon className="h-5 w-5 text-primary" aria-hidden />
                                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">0{i + 1}</span>
                                        </div>
                                        <h4 className="mt-3 text-base font-semibold text-foreground">{title}</h4>
                                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </motion.div>

                    {/* Blutech + Beyond coding */}
                    <div className="mt-6 md:mt-8 grid md:grid-cols-2 gap-6 md:gap-8">
                        <motion.div variants={itemVariants} className="rounded-2xl border border-border/50 p-6 sm:p-8 transition-all duration-500 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                            <div className="flex items-center gap-5">
                                <div className="min-w-0 flex-1 text-left">
                                    <h3 className="text-xl font-bold text-foreground">Blutech</h3>
                                    <p className="mt-3 text-base leading-relaxed text-muted-foreground/90">
                                        Operating under <strong className="text-foreground">Blutech</strong>, I accept commissions and freelance projects, expanding my expertise beyond personal work to deliver tailored solutions for clients.
                                    </p>
                                </div>
                                <img src="/blutech2.webp" alt="Blutech Logo" loading="lazy" decoding="async" className="w-24 sm:w-28 h-auto shrink-0 object-contain" />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="rounded-2xl border border-border/50 p-6 sm:p-8 transition-all duration-500 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                            <h3 className="text-xl font-bold text-foreground">Beyond Coding</h3>
                            <p className="mt-3 text-base leading-relaxed text-muted-foreground/90">
                                When I'm not at my computer, I'm usually exploring the latest AI tools and tech trends, experimenting with new frameworks, or gaming. Staying curious and keeping a healthy work-life balance is key to sustained creativity and productivity.
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
