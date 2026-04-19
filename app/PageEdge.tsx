"use client";

import { useEffect, useRef, useState } from "react";

// 1in = 96 CSS px (W3C-fixed, independent of device DPR).
const PAGE_PX = 11 * 96;

/**
 * Dev-only overflow warning. Measures the nearest <article> ancestor and, if
 * content extends past the 11-inch page boundary, renders a red dashed line
 * at that boundary with the exact overflow magnitude.
 *
 * Stripped entirely in production via `process.env.NODE_ENV` gating at the
 * call site — this file's render path is only reached in `bun dev`.
 *
 * A programmatic fit signal shared with `bun test` is deferred until
 * `@chenglou/pretext` ships its server-side path. Until then, this in-browser
 * indicator is the edit-loop signal.
 */
export function PageEdge() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    const article = anchorRef.current?.closest("article");
    if (!article) return;

    const measure = () => {
      const height = article.getBoundingClientRect().height;
      setOverflowPx(Math.max(0, height - PAGE_PX));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(article);
    return () => ro.disconnect();
  }, []);

  if (overflowPx === 0) {
    // Keep the ref attached so ResizeObserver can find the article on first mount.
    return <div ref={anchorRef} className="hidden" />;
  }

  const inches = (overflowPx / 96).toFixed(2);
  return (
    <div
      ref={anchorRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[11in] border-t-2 border-dashed border-red-500/80 print:hidden">
      <span className="absolute -top-[10pt] right-0 pr-[0.2in] text-[7pt] font-semibold uppercase tracking-[0.08em] text-red-600">
        overflows by {inches}in
      </span>
    </div>
  );
}
