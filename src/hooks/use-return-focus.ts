import { useCallback, useRef } from "react";

/**
 * Radix only restores focus to a <DialogTrigger>. Our dialogs are opened from cards/rows,
 * so call `remember()` right before opening and pass `onCloseAutoFocus` to <DialogContent>
 * to put keyboard users back where they were.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);

  const remember = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
    opener.current?.focus({ preventScroll: true });
  }, []);

  return { remember, onCloseAutoFocus };
}
