/**
 * "View Details" label that fades in over the middle of a card's image while the card is hovered or
 * focused. The card must carry the `group` class; it is a pure hint, the card itself handles the click.
 */
export function ViewDetailsHint() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 translate-y-1 whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-[#fff] opacity-0 shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition-all duration-150 group-hover:-translate-y-1/2 group-hover:opacity-100 group-focus-within:-translate-y-1/2 group-focus-within:opacity-100"
    >
      View Details
    </span>
  );
}
