// ABOUTME: Client component that keeps --resume-scale synced to window.innerWidth,
// fixing Safari's 100vw-in-zoom feedback loop that collapses the scale to 1.
'use client';
import { useEffect } from 'react';

export function ResumeScaler() {
  useEffect(() => {
    function update() {
      document.documentElement.style.setProperty(
        '--resume-scale',
        String(Math.min(1, (window.innerWidth - 32) / 816))
      );
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return null;
}
