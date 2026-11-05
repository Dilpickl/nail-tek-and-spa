"use client";

import { useEffect } from "react";

/**
 * Marks scroll-animated elements as shown once they are properly on screen.
 * - `.nt-title[data-play="scroll"]`: only when fully visible and above the
 *   bottom fifth of the viewport, so titles never play before you reach them.
 * - `[data-reveal="photo"]` / `[data-reveal="wipe"]`: a good chunk visible.
 * - other `[data-reveal]`: as soon as they start entering.
 * Uses a data attribute (not a class) so React re-renders never undo it.
 */
export function MotionObserver() {
  useEffect(() => {
    const show = (el: Element) => el.setAttribute("data-shown", "");

    const titles = Array.from(document.querySelectorAll('.nt-title[data-play="scroll"]'));
    const photos = Array.from(
      document.querySelectorAll('[data-reveal="photo"], [data-reveal="wipe"]')
    );
    const rest = Array.from(document.querySelectorAll("[data-reveal]")).filter(
      (el) => !photos.includes(el)
    );

    if (!("IntersectionObserver" in window)) {
      [...titles, ...photos, ...rest].forEach(show);
      return;
    }

    const observers: IntersectionObserver[] = [];
    const watch = (els: Element[], options: IntersectionObserverInit) => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            io.unobserve(entry.target);
          }
        });
      }, options);
      els.forEach((el) => io.observe(el));
      observers.push(io);
    };

    watch(titles, { threshold: 1, rootMargin: "0px 0px -20% 0px" });
    watch(photos, { threshold: 0.4, rootMargin: "0px 0px -15% 0px" });
    watch(rest, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    return () => observers.forEach((io) => io.disconnect());
  }, []);

  return null;
}
