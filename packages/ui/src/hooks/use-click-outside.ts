import { useEffect } from "react";
import type { RefObject } from "react";

/** Calls `callback` when a mousedown occurs outside the referenced element. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
): void {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}
