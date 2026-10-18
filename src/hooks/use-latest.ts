import { useRef } from "react";

/** Keeps the last non-null value so a closing modal can keep rendering its content during the exit animation */
export function useLatest<T>(value: T | null) {
  const last = useRef<T | null>(null);
  if (value !== null) last.current = value;
  return last.current;
}
