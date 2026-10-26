import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A pageable, draggable, endlessly looping carousel, used by All Projects and Certificates: 1 card on phones,
 * 2 on tablets, 3 on desktop (4 on very wide screens). Drag with the mouse or swipe to turn a page; a progress bar
 * and the current page to match. Attach `scrollRef` and `handlers` to the scrolling row, render `slots` inside it
 * (clones are marked, so give them `aria-hidden`), and call `consumeDrag()` first in a card's click handler so the
 * click that ends a drag doesn't open the card.
 *
 * It turns a page on its own every few seconds and wraps around without a visible jump: the row is padded with
 * copies of the last cards before the first and of the first cards after the last, and once it comes to rest
 * inside a copy it moves, unseen, to the same spot among the real cards. Auto-play waits while the pointer is over
 * the row, a finger or key is on it, it is off screen, the tab is hidden or `paused` is set (a dialog is open).
 *
 * Beside a page of cards a sliver of the neighbouring cards shows, fading out toward the edge, so it's clear
 * the row continues; on wide screens the row grows into the free space beside the heading. `layout` carries
 * the styles for that: `wrapStyle` for the element around the row, `rowStyle` for the row, `cardWidth` for each
 * card's wrapper, and `emptySlots` spacers (same width) to append after the last card when there is nothing to loop.
 */
const GAP = 24;
const AUTOPLAY_DELAY = 4500; // how long a page rests before the next one slides in
const AUTOPLAY_SLIDE_MS = 1100;
const TURN_SLIDE_MS = 650; // a swipe, the progress bar

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface CarouselSlot {
  /** Which item to render here */
  index: number;
  /** A copy placed before the first or after the last item to make the loop seamless */
  clone: boolean;
  /** React key for a clone; the real ones should use the item's own id */
  key: string;
}

export function useDragCarousel(count: number, { autoplay = true, paused = false }: { autoplay?: boolean; paused?: boolean } = {}) {
  const reduceMotion = useReducedMotion();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    rowRef.current = node;
    setRow(node);
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [perPage, setPerPage] = useState(3);
  const [currentCard, setCurrentCard] = useState(0);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setPerPage(width < 768 ? 1 : width < 1024 ? 2 : width < 1800 ? 3 : 4);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const currentPage = Math.min(totalPages - 1, Math.floor(currentCard / perPage));
  // With more cards than fit on a page the row loops; `lead` copies are kept on each side (a page and a sliver)
  const loop = count > perPage;
  const lead = loop ? perPage + 1 : 0;

  const slots = useMemo<CarouselSlot[]>(() => {
    const real = Array.from({ length: count }, (_, index) => ({ index, clone: false, key: `r${index}` }));
    if (!loop) return real;
    const before = Array.from({ length: lead }, (_, j) => ({ index: count - lead + j, clone: true, key: `b${j}` }));
    const after = Array.from({ length: lead }, (_, j) => ({ index: j % count, clone: true, key: `a${j}` }));
    return [...before, ...real, ...after];
  }, [count, loop, lead]);

  // The page sits centred with an equal sliver reserved on each side
  const sidePad = (perPage >= 3 ? 80 : 56) + GAP;
  const mask =
    loop && !isMobile
      ? `linear-gradient(to right, transparent 0, #000 ${sidePad}px, #000 calc(100% - ${sidePad}px), transparent 100%)`
      : undefined;
  const sideMobile = "calc((100vw - min(80vw, 340px)) / 2)";
  const layout = {
    // On wide screens the row grows past the heading's width into the free space (80px kept clear each side)
    wrapStyle: isMobile ? undefined : { marginInline: "calc(-24px - clamp(0px, (100vw - 1360px) / 2, 300px))" },
    rowStyle: {
      paddingLeft: isMobile ? sideMobile : `${sidePad}px`,
      paddingRight: isMobile ? sideMobile : `${sidePad}px`,
      maskImage: mask,
      WebkitMaskImage: mask,
    },
    cardWidth: isMobile ? "min(80vw, 340px)" : `calc((100% - ${(perPage - 1) * GAP}px) / ${perPage})`,
    // Empty slots after the last card so the last page lines up like the others (only when the row does not loop)
    emptySlots: loop ? 0 : totalPages * perPage - count,
  };

  // What the callbacks below read, kept current without re-creating them
  const live = useRef({ count, perPage, totalPages, loop, lead, currentCard, paused });
  live.current = { count, perPage, totalPages, loop, lead, currentCard, paused };

  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragStartCard = useRef(0);
  const animFrame = useRef(0);
  const animating = useRef(false);
  const hovering = useRef(false);
  const focused = useRef(false);
  const nextAt = useRef(0);

  /** Auto-play waits a full rest after anything the visitor does */
  const touched = () => {
    nextAt.current = Date.now() + AUTOPLAY_DELAY;
  };

  /** Distance between the left edges of two neighbouring cards, from layout (not affected by transforms) */
  const cardStep = () => {
    const el = rowRef.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return 0;
    return parseFloat(getComputedStyle(first).width) + (parseFloat(getComputedStyle(el).columnGap) || 0);
  };

  /** Moves the row without the CSS smooth-scroll animation */
  const jumpTo = (left: number) => {
    const el = rowRef.current;
    if (!el) return;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = left;
    el.style.scrollBehavior = "";
  };

  /** Position in cards from the first real one (negative among the leading copies) */
  const position = () => {
    const el = rowRef.current;
    const step = cardStep();
    return el && step ? el.scrollLeft / step - live.current.lead : 0;
  };

  /** Inside a copy at either end: move to the identical spot among the real cards. Returns how far it moved. */
  const wrap = () => {
    const { loop: looping, lead: copies, count: total } = live.current;
    const el = rowRef.current;
    const step = cardStep();
    if (!looping || !el || !step) return 0;
    const left = el.scrollLeft;
    let shift = 0;
    if (left >= (copies + total) * step - 0.5) shift = -total * step;
    else if (left < copies * step - 0.5) shift = total * step;
    if (shift) jumpTo(left + shift);
    return shift;
  };

  const syncCard = () => {
    const el = rowRef.current;
    const step = cardStep();
    const { count: total, loop: looping, lead: copies } = live.current;
    if (!el || !step || total === 0) return;
    const raw = Math.round(el.scrollLeft / step) - copies;
    const index = looping ? ((raw % total) + total) % total : Math.max(0, Math.min(raw, total - 1));
    setCurrentCard((prev) => (prev === index ? prev : index));
  };

  const handleScroll = () => {
    if (isDragging.current) dragScrollLeft.current += wrap();
    else if (!animating.current) wrap();
    syncCard();
  };

  const stopAnimation = () => {
    cancelAnimationFrame(animFrame.current);
    animating.current = false;
  };

  const animateTo = (target: number, duration: number) => {
    const el = rowRef.current;
    if (!el) return;
    stopAnimation();
    const from = el.scrollLeft;
    const distance = target - from;
    if (Math.abs(distance) < 1 || duration <= 0) {
      jumpTo(target);
      wrap();
      return;
    }
    animating.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      jumpTo(from + distance * easeInOutCubic(t));
      if (t < 1) {
        animFrame.current = requestAnimationFrame(tick);
      } else {
        animating.current = false;
        wrap();
        syncCard();
      }
    };
    animFrame.current = requestAnimationFrame(tick);
  };

  /** First card of a page; -1 and `totalPages` are the pages just outside the real ones, reached through the copies */
  const pageStart = (page: number) => {
    const { count: total, perPage: size, totalPages: pages } = live.current;
    if (page < 0) return (pages - 1) * size - total;
    if (page >= pages) return total;
    return page * size;
  };

  /**
   * Slides so card `target` is first, going the way of `dir` if given and otherwise by the shortest route
   * (the same spot can be reached through either end of a loop)
   */
  const slideTo = (target: number, duration: number, dir?: 1 | -1) => {
    const { count: total, loop: looping, lead: copies } = live.current;
    const step = cardStep();
    if (!step || total === 0) return;
    let index = Math.max(0, Math.min(target, total - 1));
    if (looping) {
      const here = position();
      const options = [target - total, target, target + total].filter((c) => c >= -copies && c <= total + 1);
      const ahead = dir ? options.filter((c) => (c - here) * dir > 0.01) : options;
      const pool = ahead.length ? ahead : options;
      index = pool.reduce((best, c) => (Math.abs(c - here) < Math.abs(best - here) ? c : best));
    }
    animateTo((copies + index) * step, reduceMotion ? 0 : duration);
  };

  const scrollToPage = (page: number) => {
    touched();
    slideTo(pageStart(Math.max(0, Math.min(page, live.current.totalPages - 1))), TURN_SLIDE_MS);
  };

  // A new list (a filter, a deleted certificate) or layout starts again from the first card
  useLayoutEffect(() => {
    if (!row) return;
    stopAnimation();
    const step = cardStep();
    if (step) jumpTo(live.current.lead * step);
    setCurrentCard(0);
  }, [row, count, perPage, loop]);

  // Cards change width with the window: stay on the same card
  useEffect(() => {
    if (!row) return;
    const observer = new ResizeObserver(() => {
      if (isDragging.current || animating.current) return;
      const step = cardStep();
      if (step) jumpTo((live.current.lead + live.current.currentCard) * step);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [row]);

  // Auto-play: one page every few seconds, only while nobody is interacting and the row can be seen
  const autoplayOn = autoplay && loop && !reduceMotion;
  useEffect(() => {
    if (!autoplayOn || !row) return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { threshold: 0.35 });
    observer.observe(row);
    nextAt.current = Date.now() + AUTOPLAY_DELAY;

    const timer = window.setInterval(() => {
      const now = Date.now();
      const blocked =
        !visible || document.hidden || live.current.paused || hovering.current || focused.current || isDragging.current || animating.current;
      if (blocked) {
        nextAt.current = Math.max(nextAt.current, now + AUTOPLAY_DELAY);
        return;
      }
      if (now < nextAt.current) return;
      nextAt.current = now + AUTOPLAY_DELAY + AUTOPLAY_SLIDE_MS;
      const { currentCard: card, perPage: size } = live.current;
      slideTo(pageStart(Math.floor(card / size) + 1), AUTOPLAY_SLIDE_MS, 1);
    }, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayOn, row]);

  useEffect(() => stopAnimation, []);

  // Images load once a card is nearly on screen, which would flash a spinner as each page slides in: warm the
  // next two pages' images (they carry their address in `data-src`) while the current one rests
  const warmed = useRef(new Set<string>());
  useEffect(() => {
    if (!row || !loop) return;
    const timer = window.setTimeout(() => {
      const { count: total, perPage: size, lead: copies } = live.current;
      for (let k = size; k < size * 3; k++) {
        const card = row.children[copies + ((currentCard + k) % total)];
        card?.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
          const src = img.dataset.src;
          if (!src || warmed.current.has(src)) return;
          warmed.current.add(src);
          new Image().src = src;
        });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [row, loop, currentCard]);

  // Drag / swipe: mouse on desktop, touch on phones; either turns a whole page
  const startDrag = (clientX: number) => {
    const el = rowRef.current;
    if (!el) return;
    stopAnimation();
    wrap();
    touched();
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = clientX;
    dragScrollLeft.current = el.scrollLeft;
    dragStartCard.current = live.current.currentCard;
    el.style.scrollSnapType = "none";
    el.style.scrollBehavior = "auto";
    if (!isMobile) el.style.cursor = "grabbing";
  };

  const moveDrag = (clientX: number) => {
    const el = rowRef.current;
    if (!isDragging.current || !el) return;
    const walk = clientX - dragStartX.current;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const endDrag = (clientX: number) => {
    const el = rowRef.current;
    if (!isDragging.current || !el) return;
    isDragging.current = false;
    el.style.cursor = "";
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";
    touched();

    const { perPage: size, totalPages: pages, loop: looping } = live.current;
    const swipe = clientX - dragStartX.current;
    const startPage = Math.min(pages - 1, Math.floor(dragStartCard.current / size));
    if (Math.abs(swipe) > 30) {
      const dir = swipe < 0 ? 1 : -1;
      const page = looping ? startPage + dir : Math.max(0, Math.min(startPage + dir, pages - 1));
      slideTo(pageStart(page), TURN_SLIDE_MS, dir);
    } else {
      slideTo(pageStart(startPage), TURN_SLIDE_MS);
    }
  };

  /** True (once) when the click that just arrived is the end of a drag */
  const consumeDrag = () => {
    if (!hasDragged.current) return false;
    hasDragged.current = false;
    return true;
  };

  const handlers = {
    onScroll: handleScroll,
    onMouseDown: (e: ReactMouseEvent) => {
      if (!isMobile) startDrag(e.pageX);
    },
    onMouseMove: (e: ReactMouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      moveDrag(e.pageX);
    },
    onMouseUp: (e: ReactMouseEvent) => endDrag(e.pageX),
    onMouseLeave: (e: ReactMouseEvent) => endDrag(e.pageX),
    onTouchStart: (e: ReactTouchEvent) => startDrag(e.touches[0].clientX),
    onTouchMove: (e: ReactTouchEvent) => moveDrag(e.touches[0].clientX),
    onTouchEnd: (e: ReactTouchEvent) => endDrag(e.changedTouches[0].clientX),
    onTouchCancel: (e: ReactTouchEvent) => endDrag(e.changedTouches[0].clientX),
    // Only a real mouse pauses auto-play by hovering: a touch screen fakes a hover that never ends
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse") hovering.current = true;
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse") {
        hovering.current = false;
        touched();
      }
    },
    onWheel: touched,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: (e: ReactFocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        focused.current = false;
        touched();
      }
    },
  };

  return { scrollRef, handlers, layout, slots, isMobile, perPage, totalPages, currentPage, scrollToPage, consumeDrag };
}
