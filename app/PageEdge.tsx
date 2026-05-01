"use client";

import { useEffect, useRef, useState } from "react";

// 1in = 96 CSS px (W3C-fixed, independent of device DPR).
const PAGE_PX = 11 * 96;
// Same threshold as Tailwind `md` and `ResumeScaler`: below this width the
// article is responsive, not a letter-size print preview.
const PAGE_LAYOUT_MIN_WIDTH_PX = 768;

/**
 * Dev-only overflow warning. Measures the nearest <article> ancestor and, if
 * content extends past the 11-inch page boundary, renders a red dashed line
 * at that boundary with the exact overflow magnitude. The line is only shown
 * at the `md` viewport (~768px) and up, where the layout matches print/PDF;
 * narrower widths use the responsive stack, so overflow there is not meaningful.
 *
 * Stripped entirely in production via `process.env.NODE_ENV` gating at the
 * call site — this file's render path is only reached in `bun dev`.
 *
 * A programmatic fit signal shared with `bun test` is deferred until
 * `@chenglou/pretext` ships its server-side path. Until then, this in-browser
 * indicator is the edit-loop signal.
 */
/**
 * Count the number of text characters whose rendered position falls below a
 * given Y boundary (in viewport coords) within `article`. Uses Range rects
 * with a binary search per straddling text node so the cost stays O(log n)
 * per node instead of O(n).
 */
function countCharsBelow(article: HTMLElement, boundaryY: number): number {
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let count = 0;
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node.nodeValue ?? "";
    if (text.length > 0) {
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.bottom > boundaryY) {
        if (rect.top >= boundaryY) {
          count += text.length;
        } else {
          // First character index whose top falls at/below the boundary.
          let lo = 0;
          let hi = text.length;
          while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            range.setStart(node, mid);
            range.setEnd(node, Math.min(mid + 1, text.length));
            const r = range.getBoundingClientRect();
            if (r.top >= boundaryY) hi = mid;
            else lo = mid + 1;
          }
          count += text.length - lo;
        }
      }
    }
    node = walker.nextNode();
  }
  return count;
}

export function PageEdge() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);
  const [overflowChars, setOverflowChars] = useState(0);
  const [isPageLayoutViewport, setIsPageLayoutViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${PAGE_LAYOUT_MIN_WIDTH_PX}px)`);
    const sync = () => setIsPageLayoutViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const article = anchorRef.current?.closest("article");
    if (!article) return;

    const measure = () => {
      const rect = article.getBoundingClientRect();
      const overflow = Math.max(0, rect.height - PAGE_PX);
      setOverflowPx(overflow);
      if (overflow > 0) {
        const boundaryY = rect.top + PAGE_PX;
        setOverflowChars(countCharsBelow(article, boundaryY));
      } else {
        setOverflowChars(0);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(article);
    return () => ro.disconnect();
  }, []);

  // Trigger on character overflow rather than pixel overflow. The article's
  // screen bottom padding (`md:pb-[0.3in]`) is larger than print's
  // (`print:pb-[0.15in]`), so a content layout that fits print can still
  // show a few px of padding past the 11in mark on screen. Counting chars
  // past the boundary ignores that whitespace and only fires when real
  // content overflows.
  const showWarning = overflowChars > 0 && isPageLayoutViewport;

  if (!showWarning) {
    // Keep the ref attached so ResizeObserver can find the article on first mount.
    return <div ref={anchorRef} className="hidden" />;
  }

  return (
    <div
      ref={anchorRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[11in] border-t-2 border-dashed border-red-500/80 print:hidden">
      <span className="absolute -top-[10pt] right-0 pr-[0.2in] text-[7pt] font-semibold uppercase tracking-[0.08em] text-red-600">
        ~{overflowChars} char{overflowChars === 1 ? "" : "s"} overflow
      </span>
    </div>
  );
}
