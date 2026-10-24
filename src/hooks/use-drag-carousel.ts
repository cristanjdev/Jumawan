import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";

/**
 * A pageable, draggable carousel, behaving like the All Projects one: 1 card on phones, 2 on tablets,
 * 3 on desktop (4 on very wide screens); drag with the mouse or swipe to turn a page, dots and the current
 * page to match. Attach `scrollRef` and `handlers` to the scrolling row; call `consumeDrag()` first in a
 * card's click handler so the click that ends a drag doesn't open the card.
 *
 * Beside a page of cards a sliver of the neighbouring cards shows, fading out toward the edge, so it's clear
 * the row continues; on wide screens the row grows into the free space beside the heading. `layout` carries
 * the styles for that: `wrapStyle` for the element around the row, `rowStyle` for the row, `cardWidth` for each
 * card's wrapper, and `emptySlots` spacers (same width) to append after the last card.
 */
const GAP = 24;

export function useDragCarousel(count: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // The page sits centred with an equal sliver reserved on each side; a sliver is left empty where there is no card
  const sidePad = (perPage >= 3 ? 80 : 56) + GAP;
  const hasPrev = !isMobile && currentPage > 0;
  const hasNext = !isMobile && currentPage < totalPages - 1;
  const mask =
    hasPrev || hasNext
      ? `linear-gradient(to right, ${hasPrev ? `transparent 0, #000 ${sidePad}px` : "#000 0"}, ${hasNext ? `#000 calc(100% - ${sidePad}px), transparent 100%` : "#000 100%"})`
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
    // Empty slots after the last card so the last page lines up like the others instead of sliding right
    emptySlots: isMobile ? 0 : totalPages * perPage - count,
  };

  /** Distance between the left edges of two neighbouring cards */
  const cardStep = () => {
    const el = scrollRef.current;
    const cards = el?.children;
    if (!el || !cards || cards.length < 2) return el ? el.scrollWidth / Math.max(1, count) : 1;
    return (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;
    setCurrentCard(Math.max(0, Math.min(Math.round(el.scrollLeft / cardStep()), count - 1)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const scrollToCard = (index: number) => {
    const el = scrollRef.current;
    if (!el || count === 0) return;
    el.scrollTo({ left: cardStep() * Math.max(0, Math.min(index, count - 1)), behavior: "smooth" });
  };
  const scrollToPage = (page: number) => scrollToCard(page * perPage);

  // A new list (a filter, a deleted certificate) starts again from the first card
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
    setCurrentCard(0);
  }, [count]);

  // Drag / swipe: mouse on desktop, touch on phones; either turns a whole page
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragStartCard = useRef(0);

  const startDrag = (clientX: number) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = clientX;
    dragScrollLeft.current = el.scrollLeft;
    dragStartCard.current = currentCard;
    el.style.scrollSnapType = "none";
    el.style.scrollBehavior = "auto";
    if (!isMobile) el.style.cursor = "grabbing";
  };

  const moveDrag = (clientX: number) => {
    const el = scrollRef.current;
    if (!isDragging.current || !el) return;
    const walk = clientX - dragStartX.current;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    el.scrollLeft = dragScrollLeft.current - walk;
  };

  const endDrag = (clientX: number) => {
    const el = scrollRef.current;
    if (!isDragging.current || !el) return;
    isDragging.current = false;
    el.style.cursor = "";
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";

    const swipe = clientX - dragStartX.current;
    const startPage = Math.floor(dragStartCard.current / perPage);
    if (Math.abs(swipe) > 30) {
      scrollToPage(swipe < 0 ? Math.min(startPage + 1, totalPages - 1) : Math.max(startPage - 1, 0));
    } else {
      scrollToPage(startPage);
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
  };

  return { scrollRef, handlers, layout, isMobile, perPage, totalPages, currentPage, scrollToPage, consumeDrag };
}
