import React, { useEffect, useRef, useState } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const returning = useRef(false);

  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    let distance = 0;
    let startedAt = null;
    let idleTimer;

    function reset() {
      distance = 0;
      startedAt = null;
      setVisible(false);
    }

    function onScroll() {
      const current = Math.max(0, window.scrollY);
      const change = previous - current;
      previous = current;
      window.clearTimeout(idleTimer);
      if (current < 320 || change < 0 || returning.current) {
        if (current < 1 || change < 0) returning.current = false;
        reset();
      } else if (change > 0) {
        const now = performance.now();
        startedAt ??= now;
        distance += change;
        if (distance >= 96 && now - startedAt >= 120) setVisible(true);
      }
      idleTimer = window.setTimeout(() => {
        returning.current = false;
        reset();
      }, 700);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(idleTimer);
    };
  }, []);

  if (!visible) return null;
  return <button type="button" className="back-to-top" aria-label="Back to top" onClick={() => {
    returning.current = true;
    setVisible(false);
    document.querySelector('.topbar .brand')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5m-6 6 6-6 6 6" />
    </svg>
  </button>;
}
