"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Autoplay from "embla-carousel-autoplay";

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useAboutSectionStore, getAboutCarouselItems } from "@/stores/useAboutSectionStore";


// The step numbers use the footer wordmark's type and gradient fill. The font stops at Bold, so a stroke in a matching
// tone makes them thicker than the footer's lettering.
const STEP_NUMBER =
    "font-heading font-bold leading-none tracking-[-0.02em] bg-clip-text text-transparent [background-image:linear-gradient(to_bottom,#0f172a,#94a3b8)] dark:[background-image:linear-gradient(to_bottom,#fff,#334155)] [-webkit-text-stroke:6px_#94a3b8] dark:[-webkit-text-stroke:6px_#64748b]";

/**
 * For the cards whose picture sits behind the text. A mouse brings the picture forward by hovering (in CSS); on a touch
 * screen a tap brings it forward and a second tap, or a tap anywhere else, sends it back.
 */
function useFrontOnTap() {
    const ref = useRef<HTMLDivElement>(null);
    const [front, setFront] = useState(false);

    useEffect(() => {
        if (!front) return;
        const close = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) setFront(false);
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [front]);

    return {
        ref,
        "data-front": front,
        onPointerUp: (event: ReactPointerEvent) => {
            if (event.pointerType !== "mouse") setFront((value) => !value);
        },
    };
}

// The three beats of how a project runs
const WORK_STEPS: { title: string; text: string }[] = [
    { title: "Plan it first", text: "Understand the problem, agree on what success looks like and map it out before building." },
    { title: "Build in steps", text: "Deliver working pieces early and often, so feedback shapes the product as it grows." },
    { title: "Review and ship", text: "I test every change and own the result. Nothing goes live unchecked." },
];

export function AboutSection() {
    const { images, loading, fetchImages } = useAboutSectionStore();
    const carouselItems = getAboutCarouselItems(images);
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [slideCount, setSlideCount] = useState(0);
    const reduceMotion = useReducedMotion();
    const photoRef = useRef<HTMLDivElement>(null);
    const blutechCard = useFrontOnTap();
    const beyondCard = useFrontOnTap();

    // The photos turn on their own every few seconds. A visitor's hand on the carousel (hover, touch, drag)
    // pauses it; it resumes when they let go. Off-screen, in a hidden tab, or with reduced motion it stays still.
    const autoplay = useMemo(
        () => (reduceMotion ? [] : [Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true, playOnInit: false })]),
        [reduceMotion],
    );

    useEffect(() => {
        const player = carouselApi?.plugins().autoplay;
        const el = photoRef.current;
        if (!player || !el) return;
        let visible = false;
        const sync = () => (visible && !document.hidden ? player.play() : player.stop());
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
        }, { threshold: 0.4 });
        observer.observe(el);
        document.addEventListener("visibilitychange", sync);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", sync);
            player.stop();
        };
    }, [carouselApi, slideCount]);

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
        <section id="about" className="relative overflow-hidden pt-8 pb-14 sm:pb-24">
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
                        <h2 className="text-[clamp(1.5rem,7.2vw,2.25rem)] md:text-5xl font-bold mb-4 text-center">
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                About Me
                            </span>
                        </h2>
                        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
                            A developer who builds careful, dependable software, from the first idea to launch
                        </p>
                    </motion.div>

                    {/* Intro: photo carousel beside the bio */}
                    <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
                        <motion.div variants={itemVariants} className="lg:col-span-5 relative group max-w-md w-full mx-auto lg:max-w-none lg:h-full">
                            <div ref={photoRef} className="relative rounded-2xl overflow-hidden aspect-square lg:aspect-auto lg:h-full lg:min-h-[22rem] shadow-2xl shadow-primary/5 bg-muted/20">
                                {loading && carouselItems.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-12 w-12 animate-pulse rounded-full bg-primary/20" aria-hidden />
                                    </div>
                                ) : (
                                    <Carousel
                                        className="w-full h-full"
                                        setApi={setCarouselApi}
                                        plugins={autoplay}
                                        opts={{
                                            align: "center",
                                            loop: true,
                                            dragFree: false,
                                            containScroll: "trimSnaps",
                                            skipSnaps: false,
                                            duration: 40, // a slower, softer slide than a manual swipe
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

                        <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col gap-5 lg:justify-between text-left">
                            <h3 className="text-center lg:text-left font-heading text-2xl sm:text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-foreground">
                                Full Stack Developer building polished, performant products
                            </h3>
                            <p className="indent-6 md:indent-8 text-justify hyphens-auto text-base md:text-lg leading-relaxed text-muted-foreground/90">
                                I bridge the gap between what people need and how it gets built, creating interfaces that are clear, accessible and fast, on a solid foundation that lasts. I work quickly with modern tools, without cutting corners on quality.
                            </p>
                            <p className="indent-6 md:indent-8 text-justify hyphens-auto text-base md:text-lg leading-relaxed text-muted-foreground/90">
                                My work spans web, mobile and desktop, from donation platforms and clinic appointment systems to a university library portal with a built-in chat helper. I take a product from idea to deployment, covering the interface, the backend and the database behind it.
                            </p>
                            <p className="indent-6 md:indent-8 text-justify hyphens-auto text-base md:text-lg leading-relaxed text-muted-foreground/90">
                                I care about the details people actually feel: fast load times, accessible interfaces and a consistent design language. Every project is a chance to ship something I'm proud of and to learn a better way of building it.
                            </p>
                        </motion.div>
                    </div>

                    {/* How I work */}
                    <motion.div variants={itemVariants} className="mt-14 md:mt-20 rounded-2xl border border-border/50 p-6 sm:p-8 lg:p-10 transition-all duration-500 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12 items-start">
                            <div className="text-center lg:text-left">
                                <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground">How I work</h3>
                                <p className="mt-4 text-base leading-relaxed text-muted-foreground/90">
                                    Good software starts with listening. I spend my time where it matters most: <strong className="text-foreground">the structure, the product decisions and the polish</strong>, and I keep clients in the loop from the first sketch to launch.
                                </p>
                            </div>

                            <ol className="grid gap-4 sm:grid-cols-3">
                                {WORK_STEPS.map(({ title, text }, i) => (
                                    <li key={title} className="relative isolate overflow-hidden rounded-xl bg-muted/15 p-5 text-center">
                                        {/* The step number: large and faded at the right edge of the card, behind the text, cropped a little by the edge */}
                                        <span
                                            aria-hidden
                                            className={`pointer-events-none absolute -right-4 bottom-[-0.14em] -z-10 select-none text-[10rem] opacity-[0.16] dark:opacity-[0.22] ${STEP_NUMBER}`}
                                        >
                                            {i + 1}
                                        </span>
                                        <h4 className="text-base font-semibold text-foreground">{title}</h4>
                                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </motion.div>

                    {/* Blutech + Beyond coding */}
                    <div className="mt-6 md:mt-8 grid md:grid-cols-2 gap-6 md:gap-8">
                        <motion.div
                            {...blutechCard}
                            variants={itemVariants}
                            className="group relative isolate overflow-hidden rounded-2xl border border-border/50 p-6 sm:p-8 transition-all duration-500 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                        >
                            {/* The logo sits behind the text as a soft watermark: centred on a phone, to the right from tablet up.
                                On hover (tap on a touch screen) it zooms in to the front, full strength, and the text steps back. */}
                            <img
                                src="/blutech2.webp"
                                alt=""
                                aria-hidden
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[86%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 scale-[0.78] object-contain opacity-[0.12] transition-[opacity,transform] duration-500 dark:opacity-[0.16] sm:left-auto sm:right-6 sm:translate-x-0 group-data-[front=true]:z-20 group-data-[front=true]:scale-100 group-data-[front=true]:!opacity-100 [@media(hover:hover)]:group-hover:z-20 [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:!opacity-100"
                            />
                            <div className="transition-opacity duration-500 group-data-[front=true]:opacity-10 [@media(hover:hover)]:group-hover:opacity-10">
                                <h3 className="text-center text-xl font-bold text-foreground sm:text-left">Blutech</h3>
                                <p className="mt-3 text-center sm:text-left text-base leading-relaxed text-muted-foreground/90">
                                    Operating under <strong className="text-foreground">Blutech</strong>, I accept commissions and freelance projects, expanding my expertise beyond personal work to deliver tailored solutions for clients.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            {...beyondCard}
                            variants={itemVariants}
                            className="group relative isolate overflow-hidden rounded-2xl border border-border/50 p-6 sm:p-8 transition-all duration-500 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                        >
                            {/* A photo of me at my gaming setup behind the text. It fades in from the left so the text stays readable; on hover
                                (a tap on a touch screen) it zooms in and comes to full strength while the text steps back. */}
                            <div
                                aria-hidden
                                className="photo-fade-in pointer-events-none absolute inset-0 -z-10 sm:left-auto sm:right-0 sm:w-[82%]"
                            >
                                <img
                                    src="/beyond-coding.webp"
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                    className="absolute inset-0 h-full w-full origin-[25%_40%] object-cover object-[20%_30%] opacity-[0.3] transition-[opacity,transform] duration-700 group-data-[front=true]:scale-110 group-data-[front=true]:opacity-95 [@media(hover:hover)]:group-hover:scale-110 [@media(hover:hover)]:group-hover:opacity-95 dark:opacity-[0.36]"
                                />
                            </div>
                            <div className="transition-opacity duration-500 group-data-[front=true]:opacity-15 [@media(hover:hover)]:group-hover:opacity-15">
                                <h3 className="text-center text-xl font-bold text-foreground sm:text-left">Beyond Coding</h3>
                                <p className="mt-3 text-center sm:text-left text-base leading-relaxed text-muted-foreground/90">
                                    When I'm not at my computer, I'm usually keeping up with new technology, experimenting with new frameworks, or gaming. Staying curious and keeping a healthy work-life balance is key to sustained creativity and productivity.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
