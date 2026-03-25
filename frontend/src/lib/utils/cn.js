import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge. This helper
 * resolves conflicts between Tailwind classes (e.g., "p-2 p-4" -> "p-4").
 *
 * @param {...(string|string[]|Object)} inputs - The classes to merge.
 * @returns {string} The merged class string.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Boolean flag indicating if the application is currently running inside an
 * iframe. Useful for handling specific UI behaviors or security checks for
 * embedded views.
 */
export const isIframe = window.self !== window.top;
