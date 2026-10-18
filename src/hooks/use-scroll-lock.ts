import { useEffect } from "react";
import { useLenis } from "lenis/react";

/** Pauses Lenis smooth scrolling while a modal is open (Radix already locks the body). */
export function useScrollLock(locked: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!locked) return;
    lenis?.stop();
    return () => lenis?.start();
  }, [locked, lenis]);
}
