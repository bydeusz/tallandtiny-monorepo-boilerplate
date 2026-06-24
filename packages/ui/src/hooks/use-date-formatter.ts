import { useMemo } from "react";

/** Formats an ISO date string as `DD-MM-YYYY`. */
export function useDateFormatter(dateString: string): string {
  return useMemo(() => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, [dateString]);
}
