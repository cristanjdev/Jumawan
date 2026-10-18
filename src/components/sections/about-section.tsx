"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useAboutSectionStore, getAboutCarouselItems } from "@/stores/useAboutSectionStore";


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
                    viewport={{ once: true, amount: 0.15, margin: "0px 0px -100px 0px" }}
                    variants={containerVariants}
                    className="max-w-6xl mx-auto"
                >
                    {/* Header - Minimalist */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center mb-16 mx-auto w-fit"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center">
                            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                About Me
                            </span>
                        </h2>
                    </motion.div>

                    <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">

                        {/* Left Column - Image/Carousel (1:1 Instagram-style) */}
                        <motion.div variants={itemVariants} className="lg:col-span-5 relative group">
                            <div className="relative rounded-2xl overflow-hidden aspect-square shadow-2xl shadow-primary/5 bg-muted/20">
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
                                                            alt={item.label}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 42vw"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                                        <div className="absolute bottom-6 left-6">
                                                            <span className="text-white/90 font-medium text-sm tracking-wider uppercase border-l-2 border-primary pl-3">
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>

                                        {/* Instagram-style dot indicators */}
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

                            {/* Decorative element behind image */}
                            <div className="absolute -z-10 top-12 -right-12 w-full h-full border border-primary/10 rounded-2xl hidden lg:block" />
                        </motion.div>

                        {/* Right Column - Text & Content */}
                        <motion.div variants={itemVariants} className="lg:col-span-7 flex flex-col justify-center">
                            <div className="prose prose-invert max-w-none text-base md:text-lg leading-relaxed text-muted-foreground/90 space-y-8 text-center lg:text-left">
                                <div>
                                    <p>
                                        I'm a <span className="text-foreground font-semibold">Full Stack Developer</span> and <span className="text-foreground font-semibold">BSIT Graduate</span> from Liceo de Cagayan University. I bridge the gap between user needs and technical implementation by building accessible, pixel-perfect user interfaces that blend art with code, rooted in clean architecture and performance optimization.
                                    </p>
                                </div>

                                <div>
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center">
                                        <div className="text-center sm:text-left">
                                            <h3 className="text-foreground font-bold text-xl mb-3">Blutech</h3>
                                            <p>
                                                Operating under <strong>Blutech</strong>, I accept commissions and freelance projects, expanding my expertise beyond personal work to deliver tailored freelance solutions for clients.
                                            </p>
                                        </div>
                                        <div className="flex justify-center sm:justify-end sm:pl-6">
                                            <img src="/blutech2.webp" alt="Blutech Logo" loading="lazy" decoding="async" className="w-full max-w-[140px] sm:max-w-[120px] h-auto object-contain" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-foreground font-bold text-xl mb-3">Beyond Coding</h3>
                                    <p>
                                        When I'm not at my computer, I'm usually exploring the latest tech trends, experimenting with new frameworks, or gaming. I believe that staying curious and maintaining a healthy work-life balance is key to sustained creativity and productivity.
                                    </p>
                                </div>
                            </div>




                        </motion.div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
}