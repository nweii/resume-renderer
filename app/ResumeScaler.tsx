// ABOUTME: Client component that keeps the resume preview scale synced to window.innerWidth.
// This avoids Safari's 100vw-in-zoom feedback loop in letter-page previews.
'use client';
import { useEffect } from 'react';

export function ResumeScaler() {
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      // Below `md` (~768px): single-column layout at native scale — no letter-paper zoom-down.
      const scale = w < 768 ? 1 : Math.min(1, (w - 32) / 816);
      document.documentElement.style.setProperty("--resume-scale", String(scale));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return null;
}
